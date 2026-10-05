const fs = require('fs');
const PDFDocument = require('pdfkit');

const input = fs.readFileSync('documentation-content.md', 'utf8');
const output = 'Framework-Documentation.pdf';
const doc = new PDFDocument({ size: 'A4', margins: { top: 54, bottom: 54, left: 58, right: 58 }, bufferPages: true, info: { Title: 'Playwright API Automation Framework - Technical Guide', Author: 'Repository Documentation' } });
doc.pipe(fs.createWriteStream(output));

for (const raw of input.split(/\r?\n/)) {
  const line = raw.trimEnd();
  if (!line.trim()) { doc.moveDown(0.45); continue; }
  if (line.startsWith('# ')) {
    doc.moveDown(0.55).font('Helvetica-Bold').fontSize(22).fillColor('#12324a').text(line.slice(2), { paragraphGap: 8 });
    doc.moveDown(0.4).strokeColor('#2c8292').lineWidth(2).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke().moveDown(0.8);
  } else if (line.startsWith('## ')) {
    doc.moveDown(0.65).font('Helvetica-Bold').fontSize(15).fillColor('#145b70').text(line.slice(3), { paragraphGap: 6 });
    doc.moveDown(0.2);
  } else if (line.startsWith('```')) {
    doc.font('Helvetica').fontSize(9).fillColor('#243746');
  } else if (line.startsWith('- ')) {
    doc.font('Helvetica').fontSize(9.5).fillColor('#202a32').text('•  ' + line.slice(2), { indent: 10, paragraphGap: 3, lineGap: 2 });
  } else {
    doc.font('Helvetica').fontSize(9.5).fillColor('#202a32').text(line, { paragraphGap: 4, lineGap: 2 });
  }
}

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica').fontSize(8).fillColor('#657680').text(`Framework Documentation  •  ${i + 1} / ${range.count}`, doc.page.margins.left, doc.page.height - 34, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center', lineBreak: false });
}
doc.end();
