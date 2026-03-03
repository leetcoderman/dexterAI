import { BaseProviderAdapter, IPCEmitter } from './base.adapter'
import {
  TestRequest,
  ProviderError,
  VerifyResult,
  ProviderCredentials
} from '@dexterai/registry-types'
import { createClient } from '@deepgram/sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'

export class DeepgramAdapter extends BaseProviderAdapter {
  providerId = 'deepgram'

  async verify(credentials: ProviderCredentials): Promise<VerifyResult> {
    try {
      const deepgram = createClient(credentials.apiKey)
      // This endpoint verifies API key validity
      const { result, error } = await deepgram.manage.getProjects()

      if (error) {
        // If the error message mentions auth or unauthorized, map to INVALID_KEY
        if (
          error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('auth')
        ) {
          throw new Error('INVALID_KEY')
        }
        throw new Error(error.message)
      }
      if (!result || result.projects.length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_KEY',
            message: 'Valid key but no active projects',
            isRetryable: false
          }
        }
      }
      return { success: true }
    } catch (e: any) {
      return {
        success: false,
        error: {
          code: 'INVALID_KEY',
          message: `Deepgram API Error: ${e.message}`,
          isRetryable: false
        }
      }
    }
  }

  async execute(
    request: TestRequest,
    credentials: ProviderCredentials,
    emitter: IPCEmitter
  ): Promise<void> {
    if (request.category === 'text_to_speech') {
      return this.executeTTS(request, credentials, emitter)
    }

    const { modelId, params } = request
    const deepgram = createClient(credentials.apiKey)

    const startTime = Date.now()

    try {
      // Check if it's a file upload or missing
      if (!params.filePath) {
        throw new Error(
          'Live Microphone streaming is pending Frontend implementation. Please upload an audio file instead.'
        )
      }

      const audioStream = fs.createReadStream(params.filePath)

      const options: any = {
        model: modelId,
        diarize: params.diarize === true,
        smart_format: params.smartFormat === true,
        punctuate: params.punctuate === true
      }

      if (params.language && params.language !== 'auto') {
        options.language = params.language

        if (params.task === 'translate') {
          // Deepgram handles translation via a specific param
          options.translate = 'en'
        }
      } else if (params.task === 'translate') {
        options.translate = 'en' // default translation target
        options.detect_language = true
      } else {
        options.detect_language = true
      }

      const { result, error } = await this.withRetry(() =>
        deepgram.listen.prerecorded.transcribeFile(audioStream, options)
      )

      if (error) {
        throw new Error(error.message)
      }

      // Calculate TTFT (Deepgram doesn't stream prerecorded, so TTFT = total time)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Extract Transcript and words
      let text = ''
      let words: Array<{ word: string; start: number; end: number }> = []

      const channel = result?.results?.channels?.[0]
      if (channel && channel.alternatives && channel.alternatives.length > 0) {
        text = channel.alternatives[0].transcript || ''

        // Map the words structure for the frontend interactive UI
        if (channel.alternatives[0].words) {
          words = channel.alternatives[0].words.map((w: any) => ({
            word: w.word || w.punctuated_word || '',
            start: w.start,
            end: w.end
          }))
        }
      }

      // Emit the successful chunk & data
      emitter.emit('test:done', {
        requestId: request.requestId,
        ttft: totalTime,
        totalTime,
        promptTokens: 0,
        completionTokens: Math.round(result?.metadata?.duration || 0), // Hack: store duration in completionTokens for DB
        finishReason: 'stop',
        resolvedModel: request.modelId,
        ...{
          // Extended result payload expected by ASRWorkspace
          result: {
            text,
            words,
            duration: result?.metadata?.duration || 0
          }
        }
      } as any) // Cast as any because ASRWorkspace expects 'result' which is not in base EvaluationMetrics
    } catch (e: any) {
      const providerError: ProviderError = {
        requestId: request.requestId,
        code: 'DEEPGRAM_ERROR',
        message: e.message || 'An unknown error occurred with Deepgram'
      }
      emitter.emit('test:error', providerError)
    }
  }

  private async executeTTS(
    request: TestRequest,
    credentials: ProviderCredentials,
    emitter: IPCEmitter
  ): Promise<void> {
    const { modelId, params } = request
    const startTime = Date.now()

    try {
      const text = params.text
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text input is required for text-to-speech.')
      }

      const audioData = await new Promise<Buffer>((resolve, reject) => {
        const url = new URL('https://api.deepgram.com/v1/speak')
        url.searchParams.set('model', modelId)
        if (params.encoding) url.searchParams.set('encoding', params.encoding)
        if (params.sample_rate) url.searchParams.set('sample_rate', String(params.sample_rate))

        const body = JSON.stringify({ text })
        const req = https.request(
          url,
          {
            method: 'POST',
            headers: {
              Authorization: `Token ${credentials.apiKey}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body)
            }
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 400) {
              let errorBody = ''
              res.on('data', (d) => (errorBody += d.toString()))
              res.on('end', () =>
                reject(new Error(`Deepgram TTS API error ${res.statusCode}: ${errorBody}`))
              )
              return
            }

            const chunks: Buffer[] = []
            let firstByte = false

            res.on('data', (chunk: Buffer) => {
              if (!firstByte) {
                firstByte = true
                const ttfb = Date.now() - startTime
                emitter.emit('test:chunk', {
                  requestId: request.requestId,
                  text: `[TTFB: ${ttfb}ms] `
                })
              }
              chunks.push(chunk)
            })
            res.on('end', () => resolve(Buffer.concat(chunks)))
            res.on('error', reject)
          }
        )

        req.on('error', reject)
        req.write(body)
        req.end()
      })

      // Save audio to temp file
      const tmpDir = path.join(os.tmpdir(), 'dexterai-tts')
      fs.mkdirSync(tmpDir, { recursive: true })
      const audioPath = path.join(tmpDir, `tts_${request.requestId}.mp3`)
      fs.writeFileSync(audioPath, audioData)

      const totalTime = Date.now() - startTime

      emitter.emit('test:done', {
        requestId: request.requestId,
        ttft: totalTime,
        totalTime,
        promptTokens: text.length,
        completionTokens: 0,
        finishReason: 'stop',
        resolvedModel: request.modelId,
        result: {
          audioPath,
          charCount: text.length,
          sizeBytes: audioData.length
        }
      } as any)
    } catch (e: any) {
      emitter.emit('test:error', {
        requestId: request.requestId,
        code: 'DEEPGRAM_TTS_ERROR',
        message: e.message || 'Text-to-speech failed'
      })
    }
  }
}
