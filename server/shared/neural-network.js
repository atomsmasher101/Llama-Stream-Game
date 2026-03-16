(function (global) {
  class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
      this.inputSize = inputSize;
      this.hiddenSize = hiddenSize;
      this.outputSize = outputSize;
      this.w1 = new Float32Array(inputSize * hiddenSize);
      this.w2 = new Float32Array(hiddenSize * outputSize);
      this.b1 = new Float32Array(hiddenSize);
      this.b2 = new Float32Array(outputSize);
      this.fitness = 0;
      this.randomize();
    }

    randomize() {
      const scale1 = Math.sqrt(2 / this.inputSize);
      const scale2 = Math.sqrt(2 / this.hiddenSize);
      for (let i = 0; i < this.w1.length; i++) this.w1[i] = (Math.random() * 2 - 1) * scale1;
      for (let i = 0; i < this.w2.length; i++) this.w2[i] = (Math.random() * 2 - 1) * scale2;
      for (let i = 0; i < this.b1.length; i++) this.b1[i] = 0;
      for (let i = 0; i < this.b2.length; i++) this.b2[i] = 0;
    }

    clone() {
      const nn = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
      nn.w1.set(this.w1); nn.w2.set(this.w2);
      nn.b1.set(this.b1); nn.b2.set(this.b2);
      nn.fitness = this.fitness || 0;
      nn.deaths = this.deaths || 0;
      nn.levelsCompleted = this.levelsCompleted || 0;
      nn.enemiesKilled = this.enemiesKilled || 0;
      nn.isExplorer = this.isExplorer || false;
      nn.id = this.id || null;
      return nn;
    }

    forward(inputs) {
      const hidden = new Float32Array(this.hiddenSize);
      for (let j = 0; j < this.hiddenSize; j++) {
        let s = this.b1[j];
        for (let i = 0; i < this.inputSize; i++) s += inputs[i] * this.w1[i * this.hiddenSize + j];
        hidden[j] = Math.tanh(s);
      }
      const outputs = new Float32Array(this.outputSize);
      for (let k = 0; k < this.outputSize; k++) {
        let s = this.b2[k];
        for (let j = 0; j < this.hiddenSize; j++) s += hidden[j] * this.w2[j * this.outputSize + k];
        outputs[k] = Math.tanh(s);
      }
      return outputs;
    }

    mutate(rate, varianceOrSigma = 0.25) {
      const highVariance = typeof varianceOrSigma === 'boolean' ? varianceOrSigma : false;
      const sigma = typeof varianceOrSigma === 'number' ? varianceOrSigma : (highVariance ? 0.45 : 0.3);
      const vm = highVariance ? 3.0 : 1.0;
      const mutateValue = (v) => {
        if (Math.random() >= rate) return v;
        if (highVariance && Math.random() < 0.2) return (Math.random() * 2 - 1) * 0.5;
        return v + (Math.random() * 2 - 1) * sigma * vm;
      };
      for (let i = 0; i < this.w1.length; i++) this.w1[i] = mutateValue(this.w1[i]);
      for (let i = 0; i < this.w2.length; i++) this.w2[i] = mutateValue(this.w2[i]);
      for (let i = 0; i < this.b1.length; i++) this.b1[i] = mutateValue(this.b1[i]);
      for (let i = 0; i < this.b2.length; i++) this.b2[i] = mutateValue(this.b2[i]);
    }
  }

  global.LlamaShared = global.LlamaShared || {};
  global.LlamaShared.NeuralNetwork = NeuralNetwork;
})(window);
