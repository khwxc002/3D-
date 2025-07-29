export class DCT {
  private size: number;
  private matrix: Float32Array;

  constructor(size: number) {
    this.size = size;
    this.matrix = this.createDCTMatrix(size);
  }

  private createDCTMatrix(size: number): Float32Array {
    const matrix = new Float32Array(size * size);
    const norm = Math.sqrt(2 / size);
    
    for (let k = 0; k < size; k++) {
      for (let n = 0; n < size; n++) {
        matrix[k * size + n] = norm * Math.cos(Math.PI * k * (n + 0.5) / size);
      }
    }
    
    return matrix;
  }

  transform(data: Float32Array): Float32Array {
    const result = new Float32Array(this.size);
    for (let k = 0; k < this.size; k++) {
      let sum = 0;
      for (let n = 0; n < data.length; n++) {
        sum += data[n] * this.matrix[k * data.length + n];
      }
      result[k] = sum;
    }
    return result;
  }
}