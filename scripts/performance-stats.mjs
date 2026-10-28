// Nearest-rank p75; median averages the two middle samples when n is even.
// Every finite observation is retained, including the minimum and maximum.
export function summarize(values) {
  if (!values.length || values.some(v => !Number.isFinite(v))) throw new Error('Expected nonempty finite observations');
  const sorted = [...values].sort((a,b) => a-b), n = sorted.length;
  return { n, mean: values.reduce((a,b)=>a+b,0)/n, min: sorted[0], median: n%2 ? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2, p75: sorted[Math.ceil(n*.75)-1], max: sorted[n-1] };
}
