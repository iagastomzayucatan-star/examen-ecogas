const BASE = 'https://firestore.googleapis.com/v1/projects/app-ecogas-64a25/databases/(default)/documents';

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

async function main() {
  const qRes = await fetch(`${BASE}/ecogas_kahoot_config/questions`);
  const qDoc = firestoreDocToJs(await qRes.json());
  console.log('=== CLOUD QUESTIONS ===');
  if (qDoc && qDoc.list) {
    qDoc.list.forEach((q, idx) => {
      console.log(`#${idx + 1} (id=${q.id}): ${q.question}`);
      console.log(`   correctIndex: ${q.correctIndex} -> [${['A','B','C','D'][q.correctIndex]}] ${q.options[q.correctIndex]}`);
      q.options.forEach((opt, oi) => {
        console.log(`      ${['A','B','C','D'][oi]} (${oi}): ${opt}`);
      });
    });
  }

  const subRes = await fetch(`${BASE}/ecogas_capacitacion_respuestas?pageSize=300`);
  const subData = await subRes.json();
  const subs = (subData.documents || []).map(firestoreDocToJs);
  console.log('\n=== SUBMISSIONS ===');
  subs.forEach(s => {
    console.log(`Doc ID: ${s.id} | Name: ${s.fullName} | Score: ${s.score} (${s.correctCount}/${s.totalQuestions})`);
    if (Array.isArray(s.breakdown)) {
      [9, 10].forEach(idx => {
        const b = s.breakdown[idx];
        if (b) {
          console.log(`   Q#${idx + 1}: ${b.question}`);
          console.log(`      userAnswer (${b.userOptionIndex}): ${b.userAnswer}`);
          console.log(`      correctAnswer (${b.correctOptionIndex}): ${b.correctAnswer} | isCorrect: ${b.isCorrect}`);
        }
      });
    }
  });
}

main().catch(console.error);
