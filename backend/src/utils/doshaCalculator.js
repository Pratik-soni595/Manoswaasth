const resolveTieBreak = (counts) => {
  const maxScore = Math.max(counts.Vata, counts.Pitta, counts.Kapha);
  // Tie break deterministic order: Vata > Pitta > Kapha
  if (counts.Vata === maxScore) return 'Vata';
  if (counts.Pitta === maxScore) return 'Pitta';
  return 'Kapha';
};

const resolveDominantType = (totalCounts, totalQuestions) => {
  const vataPct = (totalCounts.Vata / totalQuestions) * 100;
  const pittaPct = (totalCounts.Pitta / totalQuestions) * 100;
  const kaphaPct = (totalCounts.Kapha / totalQuestions) * 100;

  const maxPct = Math.max(vataPct, pittaPct, kaphaPct);

  const isVataMax = vataPct === maxPct;
  const isPittaMax = pittaPct === maxPct;
  const isKaphaMax = kaphaPct === maxPct;

  if (isVataMax && isPittaMax && isKaphaMax) return 'Vata-Pitta-Kapha';
  
  if (isVataMax && isPittaMax) return 'Vata-Pitta';
  if (isPittaMax && isKaphaMax) return 'Pitta-Kapha';
  if (isVataMax && isKaphaMax) return 'Vata-Kapha';

  if (isVataMax) return 'Vata';
  if (isPittaMax) return 'Pitta';
  if (isKaphaMax) return 'Kapha';
  
  return 'Vata'; // Fallback entirely, shouldn't reach here
};

exports.calculateDoshaResult = (answers, flatQuestions) => {
  const buckets = {
    physical: { Vata: 0, Pitta: 0, Kapha: 0 },
    metabolism: { Vata: 0, Pitta: 0, Kapha: 0 },
    mental: { Vata: 0, Pitta: 0, Kapha: 0 },
  };

  const totalCounts = { Vata: 0, Pitta: 0, Kapha: 0 };
  const totalQuestions = 15; // By requirement

  answers.forEach((answer) => {
    const q = flatQuestions.find((fq) => fq.id === answer.questionId);
    if (!q) return;

    if (buckets[q.categoryKey] && ['Vata', 'Pitta', 'Kapha'].includes(answer.selectedDosha)) {
      buckets[q.categoryKey][answer.selectedDosha] += 1;
      totalCounts[answer.selectedDosha] += 1;
    }
  });

  const result = {
    physical: resolveTieBreak(buckets.physical),
    metabolism: resolveTieBreak(buckets.metabolism),
    mental: resolveTieBreak(buckets.mental),
  };

  const dominantType = resolveDominantType(totalCounts, totalQuestions);

  return { result, dominantType };
};
