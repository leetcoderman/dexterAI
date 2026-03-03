import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import type { ChatMessage } from '@dexterai/registry-types'

export async function generateMarkdown(title: string, messages: ChatMessage[]): Promise<string> {
  let md = `# ${title || 'Untitled Conversation'}\n\n`
  for (const m of messages) {
    if (m.role === 'system') continue
    const roleName = m.role === 'user' ? 'User' : `Assistant (${m.model_id || 'unknown'})`
    md += `## ${roleName}\n${m.content}\n\n`
  }
  return md
}

export async function generatePDF(title: string, messages: ChatMessage[]): Promise<Uint8Array> {
  const doc = new jsPDF()
  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = margin

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const splitTitle = doc.splitTextToSize(title || 'Untitled Conversation', pageWidth - margin * 2)
  doc.text(splitTitle, margin, y)
  y += splitTitle.length * 10 + 5

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  for (const m of messages) {
    if (m.role === 'system') continue

    // Check for page break
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }

    // Role header
    doc.setFont('helvetica', 'bold')
    const roleName = m.role === 'user' ? 'USER' : `ASSISTANT (${m.model_id || 'unknown'})`
    doc.text(roleName, margin, y)
    y += 6

    // Content
    doc.setFont('helvetica', 'normal')
    const splitText = doc.splitTextToSize(m.content, pageWidth - margin * 2)

    // Handle multi-page content
    for (const line of splitText) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 5
    }
    y += 10 // Space between messages
  }

  return new Uint8Array(doc.output('arraybuffer'))
}

export async function generateDOCX(title: string, messages: ChatMessage[]): Promise<Uint8Array> {
  const children: any[] = [
    new Paragraph({
      text: title || 'Untitled Conversation',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ]

  for (const m of messages) {
    if (m.role === 'system') continue

    const roleName = m.role === 'user' ? 'USER' : `ASSISTANT (${m.model_id || 'unknown'})`

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: roleName,
            bold: true,
            size: 24
          })
        ],
        spacing: { before: 200, after: 100 }
      })
    )

    // Split content by newlines and add paragraphs
    const lines = m.content.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 100 }
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }]
  })

  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
