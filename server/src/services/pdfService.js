const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { uploadDir } = require('../config/env');
const { uploadPdfToCloudinary } = require('./cloudinaryService');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const placeholderPattern = (key) => new RegExp(`\\{\\{${key}\\}\\}`, 'g');

const formatDate = (value) => {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatSalary = (currency, amount) => {
  const code = typeof currency === 'string' && currency.trim() !== '' ? currency.trim() : 'USD';
  const value = Number(amount);
  if (Number.isNaN(value)) return `${code} 0`;
  return `${code} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const applyPlaceholders = (template, data) => {
  let html = template;
  const entries = Object.entries(data);

  for (const [key, value] of entries) {
    const replacement = value === undefined || value === null ? '' : String(value);
    html = html.replace(placeholderPattern(key), replacement);
  }

  // Replace any remaining placeholders with empty string to avoid leaking template syntax.
  html = html.replace(/\{\{\w+\}\}/g, '');

  return html;
};

const launchBrowser = async () => {
  const args = ['--no-sandbox', '--disable-setuid-sandbox'];

  try {
    return await puppeteer.launch({
      headless: 'new',
      args,
    });
  } catch (error) {
    console.warn('Puppeteer default launch failed, trying with additional flags:', error.message);
    return puppeteer.launch({
      headless: true,
      args: [...args, '--disable-dev-shm-usage', '--disable-gpu'],
    });
  }
};

const generatePdf = async (templateName, data) => {
  if (!templateName || typeof templateName !== 'string') {
    throw new Error('Template name is required');
  }

  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');
  const populatedHtml = applyPlaceholders(template, data);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `${templateName}-${uuidv4()}`;
  const outputPath = path.join(uploadDir, `${filename}.pdf`);

  try {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(populatedHtml, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    } finally {
      await browser.close();
    }

    // Read the generated PDF and upload to Cloudinary
    const pdfBuffer = fs.readFileSync(outputPath);
    const cloudinaryUrl = await uploadPdfToCloudinary(pdfBuffer, filename, 'rove-hire/documents');

    // Delete local file after successful upload
    fs.unlinkSync(outputPath);

    return cloudinaryUrl;
  } catch (error) {
    console.warn('Puppeteer PDF generation failed, using pdf-lib fallback:', error.message);
    return generateFallbackPdf(templateName, data, outputPath);
  }
};

const generateFallbackPdf = async (templateName, data, outputPath) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = height - 60;

  const addLine = (text, options = {}) => {
    const size = options.size || 12;
    const f = options.bold ? bold : font;
    const color = options.color || rgb(0, 0, 0);
    page.drawText(text, { x: 60, y, size, font: f, color });
    y -= size + (options.gap || 8);
  };

  const addWrapped = (text, options = {}) => {
    const size = options.size || 11;
    const f = options.bold ? bold : font;
    const maxWidth = width - 120;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const w = f.widthOfTextAtSize(test, size);
      if (w > maxWidth && line) {
        page.drawText(line, { x: 60, y, size, font: f });
        y -= size + 4;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: 60, y, size, font: f });
      y -= size + 8;
    }
  };

  page.drawText('ROVE', { x: 60, y, size: 24, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 40;

  if (templateName === 'offer-letter') {
    addLine('OFFER LETTER', { size: 18, bold: true, gap: 16 });
    addLine(`Date: ${data.date || formatDate(new Date())}`);
    addLine(`Candidate: ${data.candidateName || ''}`);
    y -= 10;
    addWrapped(`Dear ${data.candidateName || 'Candidate'},`);
    addWrapped(`We are pleased to offer you the position of ${data.role || 'Role'} at ROVE. This offer includes a compensation package of ${data.salaryAmount || ''}, reporting to ${data.reportingManager || 'Hiring Manager'}.`);
    addWrapped('This offer is contingent upon the successful completion of reference checks and your acceptance of the accompanying NDA.');
    y -= 20;
    addLine('Accepted by candidate: _________________________', { size: 11 });
    addLine(`Date: ${data.date || formatDate(new Date())}`, { size: 11 });
    y -= 10;
    addLine('For ROVE', { size: 11, bold: true });
    addLine('_________________________', { size: 11 });
  } else {
    addLine('NON-DISCLOSURE AGREEMENT', { size: 18, bold: true, gap: 16 });
    addLine(`Date: ${data.date || formatDate(new Date())}`);
    addLine(`Party: ${data.candidateName || ''}`);
    y -= 10;
    addWrapped('This Non-Disclosure Agreement ("Agreement") is entered into by and between ROVE and the party named above. The party agrees to hold all confidential information disclosed by ROVE in strict confidence.');
    addWrapped('This agreement shall remain in effect for the duration of the relationship and survive termination for a period of two years.');
    y -= 20;
    addLine('Signed: _________________________', { size: 11 });
    addLine(`Date: ${data.date || formatDate(new Date())}`, { size: 11 });
    addLine('For ROVE', { size: 11, bold: true });
    addLine('_________________________', { size: 11 });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);

  // Upload fallback PDF to Cloudinary
  const filename = path.basename(outputPath, '.pdf');
  const pdfBuffer = fs.readFileSync(outputPath);
  const cloudinaryUrl = await uploadPdfToCloudinary(pdfBuffer, filename, 'rove-hire/documents');

  // Delete local file after successful upload
  fs.unlinkSync(outputPath);

  return cloudinaryUrl;
};

const generateOfferLetter = async (data) => {
  const payload = {
    candidateName: data.candidateName,
    role: data.roleTitle || 'Role',
    salaryCurrency: data.salaryCurrency || 'USD',
    salaryAmount: formatSalary(data.salaryCurrency, data.salaryAmount),
    startDate: formatDate(data.startDate),
    reportingManager: data.reportingManager || 'Hiring Manager',
    location: data.location || 'Remote / TBD',
    date: formatDate(new Date()),
  };

  return generatePdf('offer-letter', payload);
};

const generateNda = async (data) => {
  const payload = {
    candidateName: data.candidateName,
    date: formatDate(new Date()),
  };

  return generatePdf('nda', payload);
};

module.exports = {
  generatePdf,
  generateOfferLetter,
  generateNda,
};
