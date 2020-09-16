math.DenseMatrix.prototype.broadcast = function () {
  let broadcasted;
  // Check vector shape:
  let mySize = this.size();
  if(mySize.length === 2){
    if (mySize[0] == 1)  { // Row vector
      broadcasted = this;
      for (var col = 0; col < mySize[1]-1; col++) {
        broadcasted = math.concat(broadcasted, this, 0);
      }
    } else if (mySize[1] == 1)  { // Column vector
      broadcasted = this;
      for (var row = 0; row < mySize[0]-1; row++) {
        broadcasted = math.concat(broadcasted, this, 1);
      }
    } else {
      console.log("Error: matrix is 2-dimensional but is not a vector");
    }
  } else {
    console.log("Error: matrix has more than 2 dimensions");
  }
  return broadcasted;
}

math.DenseMatrix.prototype.rowSum = function() {
  let nRows = this.size()[0];
  let nCols = this.size()[1];
  let rowSum = math.zeros(nRows, 1);
  for (var row = 0; row < nRows; row++) {
    for (var col = 0; col < nCols; col++) {
      rowSum.set([row, 0], rowSum.get([row, 0])+this.get([row, col]));
    }
  }
  return rowSum
}

math.DenseMatrix.prototype.colSum = function() {
  let nRows = this.size()[0];
  let nCols = this.size()[1];
  let colSum = math.zeros(1, nCols);
  for (var col = 0; col < nCols; col++) {
    for (var row = 0; row < nRows; row++) {
      colSum.set([0, col], colSum.get([0, col])+this.get([row, col]));
    }
  }
  return colSum
}

math.DenseMatrix.prototype.colAverage = function() {
  return math.dotDivide(this.colSum(), this.size()[0]);
}

function distToEdge(px, py, e1x, e1y, e2x, e2y) {
  var edgeLengthSquared = sq(e1x-e2x)+ sq(e1y-e2y);
  if (edgeLengthSquared === 0) return dist(px, py, e1x, e1y); // Should never fall here, but anyway...
  var t = ((px - e1x) * (e2x - e1x) + (py - e1y) * (e2y - e1y))/edgeLengthSquared;
  t = constrain(t, 0, 1);
  return dist(px, py, e1x + t*(e2x - e1x), e1y + t*(e2y - e1y));
}

function logMatrix(matrix) {
  for (var row = 0; row < matrix.size()[0]; row++) {
    console.log("row "+row+": "+math.row(matrix, row));
  }
}
