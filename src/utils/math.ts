/**
 * Utility functions for facial recognition vector mathematics.
 * These are used to calculate the similarity between face embeddings.
 */

/**
 * Computes the dot product of two vectors.
 */
export function dotProduct(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimension');
  }
  let dot = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dot += vectorA[i] * vectorB[i];
  }
  return dot;
}

/**
 * Computes the magnitude (L2 norm) of a vector.
 */
export function magnitude(vector: number[]): number {
  let sumOfSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumOfSquares += vector[i] * vector[i];
  }
  return Math.sqrt(sumOfSquares);
}

/**
 * Computes the Cosine Similarity between two vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized face embeddings).
 * A value closer to 1.0 means higher similarity.
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  const dot = dotProduct(vectorA, vectorB);
  const magA = magnitude(vectorA);
  const magB = magnitude(vectorB);

  if (magA === 0 || magB === 0) {
    return 0; // Avoid division by zero
  }
  return dot / (magA * magB);
}

/**
 * Computes the Euclidean Distance (L2 distance) between two vectors.
 * A value closer to 0.0 means higher similarity.
 */
export function euclideanDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same dimension');
  }
  let sumOfSquares = 0;
  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i];
    sumOfSquares += diff * diff;
  }
  return Math.sqrt(sumOfSquares);
}

/**
 * Normalizes a vector to have a unit length (L2 norm of 1.0).
 * MobileFaceNet outputs normalized embeddings, but this ensures precision.
 */
export function l2Normalize(vector: number[]): number[] {
  const mag = magnitude(vector);
  if (mag === 0) {
    return vector;
  }
  return vector.map(val => val / mag);
}
