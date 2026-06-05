import { cosineSimilarity, dotProduct, euclideanDistance, l2Normalize } from './math';

describe('face vector math', () => {
  it('computes dot products and cosine similarity', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
  });

  it('normalizes vectors and computes distance', () => {
    expect(l2Normalize([3, 4])).toEqual([0.6, 0.8]);
    expect(euclideanDistance([1, 2], [4, 6])).toBe(5);
  });
});
