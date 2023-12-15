# Lossy ReLU Inspired Algorithm

### Overview

The Lossy ReLU activation function is a modified version of the ReLU function that introduces a mean deactivation of 0.4 before transitioning into activation for values greater than 0.4. This algorithm aims to create a decision-making process similar to ReLU but with a different behavior for values below 0.4.

we use both dimension and file size to calculate ratio for one-way lossy compression with this algorithm!

we’re trying to balance between performance and image quality because it’s obvious that performance will be better, but we need to focus on how much it’s going to be better without degrading too much image quality!

### Implementation

```jsx
const avgDimension = (width + height) / 2;
const compressionRatio = (avgDimension * 100) / bufferLength;

Math.max(compressionRatio, 0.4);

const compressedBuffer = sharp(blob)
         .jpeg({ quality: Math.floor(compressionRatio * 100) })
         .toBuffer();

```

### Experimental Results

The following are a series of 15 compression ratios obtained from experimental results:

- 0.5980759043762068
- 0.4
- 0.5771252572816252
- 0.40837488103862163
- 0.47052118042823204
- 0.625636092405928
- 0.4
- 0.5799097515449159
- 0.8457634937721051
- 0.4
- 0.5628750154790629
- 0.4
- 0.5218752718100375
- 0.4
- 0.4

### Algorithm Application

1. The algorithm utilizes the compression ratio to compress images and return them.
2. use these compressed images to pre-computed for compression ratio again 
If the all ratio is less than 0.4, it is considered already compressed and no further compression is necessary. This indicates a successful compression.
    - you can adjust threshold by experimental for your use case!

### Summary

Based on the experimental results and the algorithm design, the Lossy ReLU Inspired Algorithm introduces a modified activation function for image compression, providing a decision-making process that balances compression quality and file size reduction.

// show experimental result of how we speed up from vanilla Redis on loading time and response time//