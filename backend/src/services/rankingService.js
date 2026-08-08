/**
 * Explainable Prioritization Engine
 * ----------------------------------
 * Ranks open civic issues by urgency using four transparent factors:
 *
 *   1. Severity   - based on priority field (Low/Medium/High)
 *   2. Age        - how long the issue has been open, unresolved
 *   3. Demand     - community upvotes (signals real-world impact)
 *   4. Duplication - how many similar reports point to the same spot
 *                    (signals a widespread/urgent problem, not a one-off)
 *
 * Each factor is scored 0-100, then combined with fixed weights.
 * The weights and raw factor scores are returned alongside the final
 * score so the dashboard can show *why* an issue was ranked where it was.
 */

const WEIGHTS = {
  severity: 0.4,
  age: 0.25,
  demand: 0.2,
  duplication: 0.15
};

const SEVERITY_SCORE = {
  High: 100,
  Medium: 55,
  Low: 20
};

const AGE_CAP_DAYS = 14; // issues older than this get max age score

const scoreSeverity = (priority) => SEVERITY_SCORE[priority] ?? 40;

const scoreAge = (createdAt) => {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const capped = Math.min(ageDays, AGE_CAP_DAYS);
  return Math.round((capped / AGE_CAP_DAYS) * 100);
};

const scoreDemand = (upvotes) => {
  // Diminishing returns: 0 upvotes = 0, 10+ upvotes = ~100
  return Math.round(Math.min(100, (upvotes || 0) * 10));
};

const scoreDuplication = (duplicateCount) => {
  // Each additional duplicate report adds urgency, capped at 100
  return Math.round(Math.min(100, (duplicateCount || 0) * 25));
};

/**
 * Computes an explainable priority score for a single civic issue.
 * @param {Object} issue - a CivicIssue document (or plain object with the same fields)
 * @param {number} duplicateCount - how many other reports reference this one as a duplicate
 */
export const computeIssueScore = (issue, duplicateCount = 0) => {
  const factors = {
    severity: scoreSeverity(issue.priority),
    age: scoreAge(issue.createdAt),
    demand: scoreDemand(issue.upvotes),
    duplication: scoreDuplication(duplicateCount)
  };

  const finalScore = Math.round(
    factors.severity * WEIGHTS.severity +
    factors.age * WEIGHTS.age +
    factors.demand * WEIGHTS.demand +
    factors.duplication * WEIGHTS.duplication
  );

  const ageDays = Math.round((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const explanation = {
    factors,
    weights: WEIGHTS,
    summary:
      `Priority ${issue.priority || 'Medium'} (${factors.severity}/100 severity) reported ${ageDays} day(s) ago ` +
      `(${factors.age}/100 age urgency), with ${issue.upvotes || 0} community upvote(s) ` +
      `(${factors.demand}/100 demand) and ${duplicateCount} similar report(s) nearby ` +
      `(${factors.duplication}/100 duplication signal).`
  };

  return { score: finalScore, explanation };
};

/**
 * Ranks a list of civic issues, attaching score + explanation to each.
 * Expects issues to already be plain objects/documents with a computed
 * duplicateCounts map (issueId -> count) if available.
 */
export const rankIssues = (issues, duplicateCounts = {}) => {
  const ranked = issues.map((issue) => {
    const duplicateCount = duplicateCounts[issue._id.toString()] || 0;
    const { score, explanation } = computeIssueScore(issue, duplicateCount);
    return {
      issue,
      priorityScore: score,
      explanation
    };
  });

  return ranked.sort((a, b) => b.priorityScore - a.priorityScore);
};