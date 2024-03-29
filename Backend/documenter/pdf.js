const fs = require('fs');
const path = require('path');
const { markdown } = require('markdown');
const { pisa } = require('xhtml2pdf');
const Config = require('./src/config');

class PDFConverter {
  constructor() {
    const config = new Config();
    this.pdfPath = config.getPdfsDir();
  }

  async markdownToPdf(markdownString, projectName) {
    const htmlString = markdown.toHTML(markdownString);

    const outFile = path.join(this.pdfPath, `${projectName}.pdf`);
    const pdfStream = fs.createWriteStream(outFile);

    const pisaStatus = await new Promise((resolve) => {
      pisa.CreatePDF(htmlString, pdfStream, (error) => {
        if (error) {
          resolve({ err: error });
        } else {
          resolve({ err: null });
        }
      });
    });

    if (pisaStatus.err) {
      throw new Error('Error generating PDF');
    }

    return outFile;
  }
}

module.exports = PDFConverter;
