const BASE = 'https://firestore.googleapis.com/v1/projects/app-ecogas-64a25/databases/(default)/documents';

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(v => toFirestoreValue(v)) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k of Object.keys(val)) {
      if (val[k] !== undefined) fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) {
    const obj = {};
    const fields = v.mapValue.fields || {};
    for (const k of Object.keys(fields)) {
      obj[k] = fromFirestoreValue(fields[k]);
    }
    return obj;
  }
  return null;
}

function firestoreDocToJs(docObj) {
  if (!docObj || !docObj.fields) return null;
  const obj = fromFirestoreValue({ mapValue: { fields: docObj.fields } }) || {};
  if (docObj.name) {
    const parts = docObj.name.split('/');
    obj.id = parts[parts.length - 1];
  }
  return obj;
}

async function patchDoc(docPath, dataObj) {
  const encoded = toFirestoreValue(dataObj).mapValue;
  const res = await fetch(`${BASE}/${docPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encoded)
  });
  if (!res.ok) {
    throw new Error(`Failed PATCH ${docPath}: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

async function main() {
  // 1. Fix ecogas_kahoot_config/questions
  const qRes = await fetch(`${BASE}/ecogas_kahoot_config/questions`);
  const qDoc = firestoreDocToJs(await qRes.json());
  if (!qDoc || !Array.isArray(qDoc.list)) {
    throw new Error('Could not load ecogas_kahoot_config/questions');
  }

  qDoc.list.forEach((q, idx) => {
    q.id = idx + 1;
    if (idx === 9 || (q.question && q.question.includes('garantía del equipo de gas LP'))) {
      q.correctIndex = 2; // Option C
      q.explanation = 'Es de un año, y el cliente debe realizar cargas en Estaciones de Gas Tomza con su Código Personal.';
      console.log(`Updated Cloud Q#${idx + 1} correctIndex -> 2 (${q.options[2]})`);
    }
    if (idx === 10 || (q.question && q.question.includes('frecuencia se debe realizar el mantenimiento al equipo GLP'))) {
      q.correctIndex = 2; // Option C
      q.explanation = 'Cada 50,000 km o 6 meses (lo que ocurra primero), con un costo de $1,500 para 4 cilindros y $2,500 para 6 y 8 cilindros.';
      console.log(`Updated Cloud Q#${idx + 1} correctIndex -> 2 (${q.options[2]})`);
    }
  });

  qDoc.updatedAt = Date.now();
  const docToSave = { ...qDoc };
  delete docToSave.id;
  await patchDoc('ecogas_kahoot_config/questions', docToSave);
  console.log('✅ Cloud questions updated in Firestore!');

  // 2. Fix submissions in ecogas_capacitacion_respuestas
  const subRes = await fetch(`${BASE}/ecogas_capacitacion_respuestas?pageSize=300`);
  const subData = await subRes.json();
  const subs = (subData.documents || []).map(firestoreDocToJs);

  for (const s of subs) {
    const docId = s.id || s.certificateId;
    let changed = false;

    if (Array.isArray(s.breakdown)) {
      s.breakdown.forEach((b, idx) => {
        const qText = b.questionText || '';
        if (idx === 9 && qText.includes('garantía del equipo de gas LP')) {
          b.correctOptionIndex = 2;
          b.explanation = 'Es de un año, y el cliente debe realizar cargas en Estaciones de Gas Tomza con su Código Personal.';
          if (s.certificateId === 'ECO-MVU48X2R') {
            b.userOptionIndex = 2; // Option C as selected in screenshot
          }
          b.isCorrect = (Number(b.userOptionIndex) === 2);
          changed = true;
        }
        if (idx === 10 && qText.includes('frecuencia se debe realizar el mantenimiento al equipo GLP')) {
          b.correctOptionIndex = 2;
          b.questionId = 11;
          b.explanation = 'Cada 50,000 km o 6 meses (lo que ocurra primero), con un costo de $1,500 para 4 cilindros y $2,500 para 6 y 8 cilindros.';
          if (s.certificateId === 'ECO-MVU48X2R') {
            b.userOptionIndex = 2; // Option C as selected in screenshot
          }
          b.isCorrect = (Number(b.userOptionIndex) === 2);
          changed = true;
        }
        // Also restore Q#1 for Alejandra Ciau to her original correct answer (Option B = 1)
        if (idx === 0 && s.certificateId === 'ECO-MVU48X2R') {
          b.userOptionIndex = 1;
          b.isCorrect = true;
          changed = true;
        }
      });
    }

    if (changed) {
      const total = s.breakdown.length || 12;
      const correct = s.breakdown.filter(b => b && b.isCorrect).length;
      s.correctCount = correct;
      s.totalQuestions = total;
      s.score = Math.round((correct / total) * 100);
      s.isApproved = (s.score >= 80);
      s.updatedAt = Date.now();

      await patchDoc(`ecogas_capacitacion_respuestas/${docId}`, s);
      console.log(`✅ Updated submission ${docId} (${s.name}): ${s.score} pts (${s.correctCount}/${s.totalQuestions})`);
    }
  }
}

main().catch(console.error);
