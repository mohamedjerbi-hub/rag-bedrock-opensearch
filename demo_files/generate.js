const fs = require('fs');
const PDFDocument = require('pdfkit');
const docx = require('docx');
const xlsx = require('xlsx');
const path = require('path');

// 1. PDF: politique_rh.pdf
const pdfPath = path.join(__dirname, 'politique_rh.pdf');
const pdfDoc = new PDFDocument();
pdfDoc.pipe(fs.createWriteStream(pdfPath));
pdfDoc.fontSize(20).text('Politique RH 2026 - Northwind Analytics', { align: 'center' });
pdfDoc.moveDown();
pdfDoc.fontSize(12).text('Congés : Les employés ont droit à 5 semaines de congés payés par an.');
pdfDoc.moveDown();
pdfDoc.text('Télétravail : La politique de télétravail autorise jusqu\'à 3 jours par semaine. Les jours de présence obligatoire sont fixés par chaque manager d\'équipe.');
pdfDoc.moveDown();
pdfDoc.text('Période d\'essai : La période d\'essai est de 3 mois, renouvelable une fois.');
pdfDoc.moveDown();
pdfDoc.text('Contacts RH : Pour toute question relative à votre contrat, contactez Sylvie Martin, Directrice RH, à l\'adresse rh@northwind-analytics.com.');
pdfDoc.end();

// 2. Word: securite_it.docx
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({ text: "Guide de Sécurité IT - Northwind Analytics", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "" }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Mots de passe : ", bold: true }),
                    new TextRun("Vos mots de passe doivent comporter au moins 12 caractères et être changés tous les 90 jours.")
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Authentification : ", bold: true }),
                    new TextRun("La double authentification (MFA) est obligatoire pour tout accès distant.")
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Réseau et Télétravail : ", bold: true }),
                    new TextRun("L'utilisation du VPN de l'entreprise est strictement obligatoire pour accéder aux ressources internes depuis votre domicile.")
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Incident de sécurité : ", bold: true }),
                    new TextRun("En cas de vol de matériel, de clic sur un lien suspect ou de comportement anormal de votre machine, déconnectez-vous d'internet et alertez immédiatement le support.")
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Responsable IT : ", bold: true }),
                    new TextRun("Pour toute validation d'accès spécifique, consultez Marc Dubois (Directeur Financier & Opérations).")
                ]
            })
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(path.join(__dirname, 'securite_it.docx'), buffer);
});

// 3. Excel: notes_de_frais.xlsx
const wb = xlsx.utils.book_new();
const ws_data = [
    ["Règle de dépense", "Montant / Condition", "Validateur", "Remarque"],
    ["Plafond Repas", "25 € par repas", "Manager direct", "Un reçu détaillé est obligatoire."],
    ["Plafond Hébergement", "120 € par nuit", "Manager direct", "Privilégier les hôtels partenaires."],
    ["Indemnité kilométrique", "0,50 € par kilomètre", "Manager direct", "Uniquement avec le véhicule personnel."],
    ["Dépense Exceptionnelle", "Toute dépense supérieure à 500 €", "Sylvie Martin (RH) ET Marc Dubois (Finances)", "Validation préalable obligatoire par e-mail."],
];
const ws = xlsx.utils.aoa_to_sheet(ws_data);
xlsx.utils.book_append_sheet(wb, ws, "Règles");
xlsx.writeFile(wb, path.join(__dirname, 'notes_de_frais.xlsx'));

// 4. Texte: faq_support.md
const mdContent = `# FAQ Support Informatique - Northwind Analytics

## Quels sont les horaires du support ?
Notre équipe vous répond du lundi au vendredi, de 8h00 à 18h00 en continu.

## Quels sont les délais de réponse ?
- Demandes standard : 24 à 48 heures.
- Demandes urgentes (bloquantes) : Prise en charge en moins de 2 heures.

## Que faire en cas d'urgence ou d'incident de sécurité ?
Appelez immédiatement le **0800 112 112**. Ce numéro est disponible 24/7 pour les incidents critiques.

## À qui s'adresser pour les problèmes de congés ou de paie ?
Le support informatique ne gère pas ces sujets. Veuillez contacter directement **Sylvie Martin**, comme indiqué dans le document de politique RH.
`;
fs.writeFileSync(path.join(__dirname, 'faq_support.md'), mdContent);

// 5. Questions de test: questions_de_test.md
const questionsContent = `# Questions de Test pour RAG

Copiez-collez ces questions dans l'interface de chat pour tester l'application.

## Questions faciles (1 seul document)
**Q1:** Combien de jours de congés ai-je par an ?
*Réponse attendue :* 5 semaines (basé sur politique_rh.pdf).

**Q2:** Quel est le plafond pour une nuit d'hôtel en déplacement ?
*Réponse attendue :* 120 € (basé sur notes_de_frais.xlsx).

## Questions croisées (Nécessite 2 documents)
**Q3:** J'ai été victime d'une tentative de phishing, que dois-je faire et quel numéro appeler ?
*Réponse attendue :* Déconnecter l'appareil d'internet (securite_it.docx) et appeler le 0800 112 112 (faq_support.md).

**Q4:** Je vais faire 2 jours de télétravail cette semaine, ai-je besoin d'outils particuliers ?
*Réponse attendue :* Oui, le VPN est strictement obligatoire (securite_it.docx), et le maximum autorisé est de 3 jours (politique_rh.pdf).

## Questions avec des chiffres (Montants, limites)
**Q5:** J'ai acheté un nouvel écran à 650 € pour le bureau, qui doit valider mon remboursement et comment le demander ?
*Réponse attendue :* C'est une dépense exceptionnelle (> 500€), elle doit être validée par Sylvie Martin et Marc Dubois au préalable (notes_de_frais.xlsx).

## Questions pièges (Hors contexte)
**Q6:** Quelle est la mutuelle de l'entreprise et comment s'y inscrire ?
*Réponse attendue :* L'IA doit indiquer poliment qu'elle ne trouve pas l'information dans les documents fournis (car l'info n'y est pas).
`;
fs.writeFileSync(path.join(__dirname, 'questions_de_test.md'), questionsContent);

console.log("Fichiers de démonstration générés avec succès !");
