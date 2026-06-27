const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { uploadDir } = require('../config/env');

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

  const filename = `${templateName}-${uuidv4()}.pdf`;
  const outputPath = path.join(uploadDir, filename);

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

  return `/uploads/${filename}`;
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
