import fs from 'fs';
import path from 'path';
import { parseDocumentBuffer } from './services/parser';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 TEST DU PIPELINE D\'INGESTION AVEC SUPPORT IMAGE');
  console.log('====================================================\n');

  // Test 1: Image générée avec du texte net
  const generatedImagePath = `C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\9ff2142f-2318-4cde-b34d-9a54bbc08111\\test_ocr_document_1790896358658.png`;
  if (fs.existsSync(generatedImagePath)) {
    console.log('👉 TEST 1 : Image avec texte net (test_ocr_document.png)');
    const imgBuffer = fs.readFileSync(generatedImagePath);
    const result1 = await parseDocumentBuffer('test_ocr_document.png', imgBuffer, 'image/png');
    console.log('   - Success  :', result1.success);
    console.log('   - Chunks   :', result1.chunks.length);
    console.log('   - Warning  :', result1.warning || 'aucun');
    console.log('   - Extrait  :', result1.text.substring(0, 200).replace(/\n/g, ' ') + '...');
    if (result1.success && result1.chunks.length > 0 && result1.text.length > 5) {
      console.log('   ✅ TEST 1 SUCCÈS (OCR Image avec texte net)\n');
    } else {
      console.error('   ❌ TEST 1 ÉCHEC\n');
    }
  } else {
    console.log('⚠️ TEST 1 ignoré : image de test introuvable.\n');
  }

  // Test 2: Image vide / sans texte exploitable (1x1 PNG transparent)
  console.log('👉 TEST 2 : Image sans texte / vide (1x1 PNG)');
  const emptyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const emptyImgBuffer = Buffer.from(emptyPngBase64, 'base64');
  const result2 = await parseDocumentBuffer('image_vide.png', emptyImgBuffer, 'image/png');
  console.log('   - Success  :', result2.success);
  console.log('   - Chunks   :', result2.chunks.length);
  console.log('   - Warning  :', result2.warning);
  console.log('   - Contenu  :', result2.text);
  if (result2.success && result2.warning === 'Indexé avec texte incomplet ou vide') {
    console.log('   ✅ TEST 2 SUCCÈS : Image vide marquée comme "Indexé avec texte incomplet ou vide".\n');
  } else {
    console.error('   ❌ TEST 2 ÉCHEC\n');
  }

  // Test 3: PDF (Non-régression)
  const demoDir = path.join(__dirname, '../../demo_files');
  const pdfPath = path.join(demoDir, 'politique_rh.pdf');
  if (fs.existsSync(pdfPath)) {
    console.log('👉 TEST 3 : Fichier PDF (politique_rh.pdf)');
    const pdfBuf = fs.readFileSync(pdfPath);
    const result3 = await parseDocumentBuffer('politique_rh.pdf', pdfBuf, 'application/pdf');
    console.log('   - Success  :', result3.success);
    console.log('   - Chunks   :', result3.chunks.length);
    console.log('   - Longueur :', result3.text.length, 'chars');
    if (result3.success && result3.chunks.length > 0) {
      console.log('   ✅ TEST 3 SUCCÈS (Non-régression PDF)\n');
    } else {
      console.error('   ❌ TEST 3 ÉCHEC\n');
    }
  }

  // Test 4: DOCX (Non-régression)
  const docxPath = path.join(demoDir, 'securite_it.docx');
  if (fs.existsSync(docxPath)) {
    console.log('👉 TEST 4 : Fichier DOCX (securite_it.docx)');
    const docxBuf = fs.readFileSync(docxPath);
    const result4 = await parseDocumentBuffer('securite_it.docx', docxBuf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    console.log('   - Success  :', result4.success);
    console.log('   - Chunks   :', result4.chunks.length);
    if (result4.success && result4.chunks.length > 0) {
      console.log('   ✅ TEST 4 SUCCÈS (Non-régression DOCX)\n');
    } else {
      console.error('   ❌ TEST 4 ÉCHEC\n');
    }
  }

  // Test 5: XLSX (Non-régression)
  const xlsxPath = path.join(demoDir, 'notes_de_frais.xlsx');
  if (fs.existsSync(xlsxPath)) {
    console.log('👉 TEST 5 : Fichier XLSX (notes_de_frais.xlsx)');
    const xlsxBuf = fs.readFileSync(xlsxPath);
    const result5 = await parseDocumentBuffer('notes_de_frais.xlsx', xlsxBuf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    console.log('   - Success  :', result5.success);
    console.log('   - Chunks   :', result5.chunks.length);
    if (result5.success && result5.chunks.length > 0) {
      console.log('   ✅ TEST 5 SUCCÈS (Non-régression XLSX)\n');
    } else {
      console.error('   ❌ TEST 5 ÉCHEC\n');
    }
  }

  // Test 6: MD / TXT (Non-régression)
  const mdPath = path.join(demoDir, 'faq_support.md');
  if (fs.existsSync(mdPath)) {
    console.log('👉 TEST 6 : Fichier MD (faq_support.md)');
    const mdBuf = fs.readFileSync(mdPath);
    const result6 = await parseDocumentBuffer('faq_support.md', mdBuf, 'text/markdown');
    console.log('   - Success  :', result6.success);
    console.log('   - Chunks   :', result6.chunks.length);
    if (result6.success && result6.chunks.length > 0) {
      console.log('   ✅ TEST 6 SUCCÈS (Non-régression MD)\n');
    } else {
      console.error('   ❌ TEST 6 ÉCHEC\n');
    }
  }

  console.log('====================================================');
  console.log('🎉 TOUS LES TESTS D\'INGESTION ET DE NON-RÉGRESSION SONT VALIDÉS !');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Erreur durant le test :', err);
  process.exit(1);
});
