let nodes = math.matrix();
let nodeRadius = 5;
let pressedNodeId = [];
let releasedNodeId = [];
let isMakingNewEdge = false;
let isMovingNode = false;
let isDeletingNode = false;
let edges = math.matrix([0]);
let clusteredEdges;
let clusteringBegan = false;
let graphMovement = 'fixed';
let inflationValue = 2;
let pruneTresholdValue = 1;
let clusterizationSpeedValue = 1;
let clusteringRunning = false;
let nodeToNodeRepulsionFactor = 0.9;
let nodeToNodeAttractionFactor = 1;
let nodeToCenterAttractionFactorX = 0;
let nodeToCenterAttractionFactorY = 0;
let dampingFactor = 0.1;
let nodesVelocity = math.matrix();
let randomForce = math.matrix();
let clusteringConverged = false;
let clusterIterationNumber = 0;
let isRecording = false;
let gif;
let waitingForDownload = false;
let targetFrameRate = 30;

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

function setup() {
  var canvas = createCanvas(parseFloat(select('#sketch-holder').style('width')), parseFloat( select('#sketch-holder').style('height')));
  canvas.parent('sketch-holder');
  frameRate(targetFrameRate);
  pruneTresholdValue = document.getElementById("pruneTresholdValue").value;
  inflationValue = document.getElementById("inflationValue").value;
};

function draw() {
  if(graphMovement === 'relaxed') relaxGraph();
  if(clusteringRunning && !clusteringConverged && frameCount%math.round(10/clusterizationSpeedValue) === 0) stepClustering();
  background(color('hsl(180, 37%, 79%)'));
  drawNodes();
  drawEdges();
  writeInfoOnCanvas();
  if(isRecording) gif.addFrame(document.getElementById('defaultCanvas0'), {copy:true, delay: 1000/targetFrameRate});
};

function relaxGraph(){
  if(nodes.size()[0] > 1 && !isMovingNode){ // Need more than 1 node to relax and cant be moving a node
    if(frameCount%10 === 0){ // Skip some calculations to save processor
      // Calculate Forces:
      let deltaPosX = math.subtract(math.row(math.transpose(nodes), 0).broadcast(), math.column(nodes, 0).broadcast());
      let deltaPosY = math.subtract(math.row(math.transpose(nodes), 1).broadcast(), math.column(nodes, 1).broadcast());
      let deltaPosNorm = math.add(math.sqrt(math.add(math.square(deltaPosX), math.square(deltaPosY))), 0.00001);//Avoid division by zero
      let nodeToNodeRepulsionForceNorm = math.dotMultiply(-nodeToNodeRepulsionFactor, math.subtract(1, deltaPosNorm));
      let nodeToNodeRepulsionForceX = math.dotMultiply(nodeToNodeRepulsionForceNorm, math.dotDivide(deltaPosX, deltaPosNorm)).rowSum();
      let nodeToNodeRepulsionForceY = math.dotMultiply(nodeToNodeRepulsionForceNorm, math.dotDivide(deltaPosY, deltaPosNorm)).rowSum();
      let nodeToNodeRepulsionForce = math.concat(nodeToNodeRepulsionForceX, nodeToNodeRepulsionForceY);
      let nodeToNodeAttractionForceX = math.dotMultiply(edges, deltaPosX).rowSum();
      let nodeToNodeAttractionForceY = math.dotMultiply(edges, deltaPosY).rowSum();
      let nodeToNodeAttractionForce = math.dotMultiply(math.concat(nodeToNodeAttractionForceX, nodeToNodeAttractionForceY), nodeToNodeAttractionFactor);
      let colAverage = nodes.colAverage();
      let farthestNodeDistToCenterX = math.max(math.abs(math.subtract(math.column(nodes, 0), 0.5)));
      let farthestNodeDistToCenterY = math.max(math.abs(math.subtract(math.column(nodes, 1), 0.5)));

      nodeToCenterAttractionFactorX = math.max(0, nodeToCenterAttractionFactorX +farthestNodeDistToCenterX-0.35);
      nodeToCenterAttractionFactorY = math.max(0, nodeToCenterAttractionFactorY +farthestNodeDistToCenterY-0.35);
      let distFromNodesToCanvasCenter = math.subtract(0.5, nodes);
      let nodeToCanvasCenterAttractionForceX = math.dotMultiply(math.column(distFromNodesToCanvasCenter, 0), nodeToCenterAttractionFactorX);
      let nodeToCanvasCenterAttractionForceY = math.dotMultiply(math.column(distFromNodesToCanvasCenter, 1), nodeToCenterAttractionFactorY);
      let nodeToCanvasCenterAttractionForce = math.concat(nodeToCanvasCenterAttractionForceX, nodeToCanvasCenterAttractionForceY);
      if(frameCount%300 === 0 || !_.isEqual(randomForce.size(), nodes.size())) randomForce = math.matrix(math.random(nodes.size(), -0.15, 0.15)); // Put some entropy to keep graph floating
      let randomForceSmoothed = math.dotMultiply(randomForce, math.sin(math.pi*(frameCount%300)/299));
      // Calculate accelerations:
      let nodesMasses = 20;
      let nodesAccelerations = math.dotDivide(math.add(nodeToNodeRepulsionForce, nodeToNodeAttractionForce, nodeToCanvasCenterAttractionForce, randomForceSmoothed), nodesMasses);
      // Update Velocities
      nodesVelocity = math.dotMultiply(math.add(nodesVelocity, nodesAccelerations), dampingFactor);
    }
    // Update Positions
    nodes = math.add(nodes, nodesVelocity);
  }
}

function windowResized() {
  resizeCanvas(parseFloat(select('#sketch-holder').style('width')),parseFloat( select('#sketch-holder').style('height')));
};

function mousePressed() {
  if(!clusteringBegan && !waitingForDownload){
    if (mouseIsOnCanvas()){
      pressedNodeId = getNodeId(mouseX, mouseY);
      if (keyIsDown(77)) { // 77: keyCode for "m"
        isMovingNode = true;
      } else if (keyIsDown(68)) { // 68: keycode for "d"
        isDeletingNode = true;
      } else { // No key pressed
        isMakingNewEdge = true;
      }
    }
  }
}

function mouseReleased() {
  if(!clusteringBegan && !waitingForDownload){
    if (mouseIsOnCanvas() && isMakingNewEdge) {
      releasedNodeId = getNodeId(mouseX, mouseY);
      if (pressedNodeId != releasedNodeId) { // CHANGE THIS WHEN DIRECTED/UNDIRECTED IS IMPLEMENTED!
        edges.set([pressedNodeId, releasedNodeId], 1);
        edges.set([releasedNodeId, pressedNodeId], 1);

      } else if (isDeletingNode) {
        deleteNode(pressedNodeId);
      }
    }
    pressedNodeId = [];
    releasedNodeId = [];
    isMovingNode = false;
    isMakingNewEdge = false;
    isDeletingNode = false;
  }
}

function mouseDragged() {
  if (mouseIsOnCanvas() && !clusteringBegan && !waitingForDownload) {
    if (isMovingNode) {
      nodes.set([pressedNodeId, 0], mouseX/width);
      nodes.set([pressedNodeId, 1], mouseY/height);
    }
  }
}

function mouseWheel(event) {
  if (!clusteringBegan && !waitingForDownload) {
    let weightFactor = 1;
    if(event.delta < 0) { weightFactor = 1.05;
    } else {              weightFactor = 0.95;
    }
    if(nodes.size()[0] > 1){ // More than 1 node
      let edgesUnderCursor = getEdgesUnderCursor(mouseX, mouseY);
      if (edgesUnderCursor != []) { // If cursor is over an edge
        for (var edge = 0; edge < edgesUnderCursor.length; edge++) {
          let newEdgeWeight = constrain(edges.get(edgesUnderCursor[edge])*weightFactor, 0.1, 1);
          if (newEdgeWeight == 0.1) newEdgeWeight = 0;
          edges.set(edgesUnderCursor[edge], newEdgeWeight);
        }
      }
    }
  }
}

function getEdgesUnderCursor(mouseX, mouseY) {
  let edgesUnderCursor = [];
  edges.forEach(
    function (value, edgeNodesIds, matrix) {
      if(value > 0) { // if edge exists
        if(distToEdge(mouseX, mouseY, nodes.get([edgeNodesIds[0], 0])*width,
                                      nodes.get([edgeNodesIds[0], 1])*height,
                                      nodes.get([edgeNodesIds[1], 0])*width,
                                      nodes.get([edgeNodesIds[1], 1])*height) < nodeRadius) {
          edgesUnderCursor.push(edgeNodesIds);
        }
      }
    }
  );
  return edgesUnderCursor;
}

function getNodeId(mouseX, mouseY) {
  for (var nodeId = 0; nodeId < nodes.size()[0]; nodeId++) { // Try to find node where mouse clicked:
    if (dist(nodes.get([nodeId, 0])*width,
             nodes.get([nodeId, 1])*height,
             mouseX, mouseY) < 4*nodeRadius) { // Avoid creating nodes too close to each other
      return nodeId;
    }
  }
  // If didn't find node, create one:
  createNode(mouseX, mouseY);
  return nodes.size()[0]-1;
}

function createNode(mouseX, mouseY) {
  nodes.subset(math.index(nodes.size()[0], [0, 1]), [mouseX/width, mouseY/height]);
  nodesVelocity.subset(math.index(nodesVelocity.size()[0], [0, 1]), [0, 0]);
  randomForce = math.resize(randomForce, [randomForce.size()[0]+1, 2], 0);
  edges = math.resize(edges, [nodes.size()[0], nodes.size()[0]], 0);
}

function deleteNode(nodeId) {
  let nOfNodes = nodes.size()[0];
  if(nOfNodes > 1){
    if(nodeId === 0) {
      edges = edges.subset(math.index(math.range(1, nOfNodes), math.range(1, nOfNodes)));
      nodes = nodes.subset(math.index(math.range(1, nOfNodes), [0, 1]));
      nodesVelocity = nodesVelocity.subset(math.index(math.range(1, nOfNodes), [0, 1]));
      randomForce = randomForce.subset(math.index(math.range(1, nOfNodes), [0, 1]));
    } else if (nodeId === nOfNodes-1) {
      edges = edges.subset(math.index(math.range(0, nOfNodes-1), math.range(0, nOfNodes-1)));
      nodes = nodes.subset(math.index(math.range(0, nOfNodes-1), [0, 1]));
      nodesVelocity = nodesVelocity.subset(math.index(math.range(0, nOfNodes-1), [0, 1]));
      randomForce = randomForce.subset(math.index(math.range(0, nOfNodes-1), [0, 1]));
    } else {
      // Remove row:
      edges = math.concat(edges.subset(math.index(math.range(0,         nodeId),  math.range(0, nOfNodes))),
                          edges.subset(math.index(math.range(nodeId+1, nOfNodes), math.range(0, nOfNodes))), 0);
      nodes = math.concat(nodes.subset(math.index(math.range(0, nodeId), [0, 1])),
                          nodes.subset(math.index(math.range(nodeId+1, nOfNodes), [0, 1])), 0);
      nodesVelocity = math.concat(nodesVelocity.subset(math.index(math.range(0, nodeId), [0, 1])),
                                  nodesVelocity.subset(math.index(math.range(nodeId+1, nOfNodes), [0, 1])), 0);
      randomForce = math.concat(randomForce.subset(math.index(math.range(0, nodeId), [0, 1])),
                                randomForce.subset(math.index(math.range(nodeId+1, nOfNodes), [0, 1])), 0);
      // Remove column:
      edges = math.concat(edges.subset(math.index(math.range(0, nOfNodes-1), math.range(0,         nodeId))),
                          edges.subset(math.index(math.range(0, nOfNodes-1), math.range(nodeId+1, nOfNodes))), 1);
    }
  } else {
    edges = math.matrix([0]);
    nodes = math.matrix();
    nodesVelocity = math.matrix();
    randomForce = math.matrix();
  }
}

function drawNodes() {
  // Draw every node:
  for (var nodeId = 0; nodeId < nodes.size()[0]; nodeId++) {
    fill(color(0, 0, 0, 255));
    stroke(color(0, 0, 0, 255));
    strokeWeight(1)
    circle(nodes.get([nodeId, 0])*width, nodes.get([nodeId, 1])*height, 2*nodeRadius);
  }
  // Draw cluster centers:
  if(clusteringBegan) {
    fill(color(255, 0, 0));
    stroke(color(255, 0, 0));
    strokeWeight(1);
    clusteredEdges.rowSum().forEach(
      function (value, index, matrix) {
        if(value > 0) {
          circle(nodes.get([index[0], 0])*width, nodes.get([index[0], 1])*height, 2*nodeRadius);
        }
      })
  }
}

function drawEdges() {
  // Draw edge that is being connected:
  if(isMakingNewEdge){
    if (dist(nodes.get([pressedNodeId, 0])*width, nodes.get([pressedNodeId, 1])*height, mouseX, mouseY) > 2*nodeRadius) {
      stroke(color(50, 50, 50, 200));
      strokeWeight(nodeRadius*0.75)
      line(nodes.get([pressedNodeId, 0])*width, nodes.get([pressedNodeId, 1])*height, mouseX, mouseY);
    }
  }
  // Draw the already connected edges:
  if(nodes.size()[0] > 1) {
    edges.forEach(
      function (edgeWeight, edgeNodesIds, matrix) {
        if (edgeWeight != 0) {
          stroke(color(50, 50, 50, 128*edgeWeight));
          strokeWeight(nodeRadius*edgeWeight*0.75)
          line(nodes.get([edgeNodesIds[0], 0])*width,
               nodes.get([edgeNodesIds[0], 1])*height,
               nodes.get([edgeNodesIds[1], 0])*width,
               nodes.get([edgeNodesIds[1], 1])*height);
        }
      }
    );
  }
  // Draw clusteredEdges:
  if(clusteringBegan) {
    clusteredEdges.forEach(
      function (edgeWeight, edgeNodesIds, matrix) {
        if (edgeWeight != 0) {
          stroke(color(255, 0, 0, 128*edgeWeight));
          strokeWeight(nodeRadius*edgeWeight*0.75)
          line(nodes.get([edgeNodesIds[0], 0])*width,
               nodes.get([edgeNodesIds[0], 1])*height,
               nodes.get([edgeNodesIds[1], 0])*width,
               nodes.get([edgeNodesIds[1], 1])*height);
        }
      }
    );
  }
}

function mouseIsOnCanvas() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    return true;
  } else {
    return false;
  }
}

function setInflationValue(value) {
  inflationValue = value;
}

function setPruneTresholdValue(value) {
  pruneTresholdValue = value;
}

function setClusterizationSpeed(value) {
  clusterizationSpeedValue = value;
}

function setGraphMovement(value) {
  graphMovement = value;
}

function record() {
  if(isRecording) {
    isRecording = false;
    blockUser();
    gif.render(function(progressPercentage) {document.getElementById('gifProgressBar').style.width = (100*progressPercentage+"%")}); // Percentage is from 0 to 1;
  } else {
    gif = new GIF({workers:3, quality:10, workerScript:'./js/gif.worker.js'});
    gif.on('finished', function(generatedGif) {unBlockUser(); window.open(URL.createObjectURL(generatedGif));});
    isRecording = true;
  }
  updateRecButton();
}

function resetClusterization() {
  clusteredEdges = [];
  clusteringBegan = false;
  clusteringRunning = false;
  clusteringConverged = false;
  clusterIterationNumber = 0;
  updatePlayPauseButton();
}

function playPauseClusterization() {
  if(!clusteringBegan) {
    beginClustering();
  }
  clusteringRunning = !clusteringRunning;
  updatePlayPauseButton();
}

function beginClustering() {
  clusteredEdges = math.add(edges, math.identity(edges.size()[0]));
  clusteredEdges = math.dotDivide(clusteredEdges, clusteredEdges.colSum().broadcast()) ; // Renormalize
  clusteringBegan = true;
  clusterIterationNumber = 0;
}

function stepClustering() {
  let newClusteredEdges = clusteredEdges;
  newClusteredEdges = math.multiply(newClusteredEdges, newClusteredEdges); // Segregate
  newClusteredEdges = math.dotPow(newClusteredEdges, inflationValue); // Inflate
  newClusteredEdges = math.dotDivide(newClusteredEdges, newClusteredEdges.colSum().broadcast()) ; // Renormalize
  let pruneTreshold = pruneTresholdValue/newClusteredEdges.size()[0];
  newClusteredEdges = math.map(newClusteredEdges, function(value){ // Prune
    if(value < pruneTreshold) return 0; else return value;
  });
  if(math.deepEqual(newClusteredEdges, clusteredEdges)) {
    clusteringConverged = true;
    clusteringRunning = false;
    updatePlayPauseButton();
    console.log("clustering converged:");
    logMatrix(newClusteredEdges);
  }
  clusteredEdges = newClusteredEdges;
  clusterIterationNumber++;
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

function updatePlayPauseButton(){
  if (clusteringRunning) {
    $('#playPauseButton').html('<i class="fa fa-pause"></i>');
  } else {
    $('#playPauseButton').html('<i class="fa fa-play"></i>');
  }
}

function updateRecButton(){
  if (isRecording) {
    document.getElementById("recButtonIcon").style.color = "red";
    document.getElementById("recButton").classList.add("pulsate");
  } else {
    document.getElementById("recButtonIcon").style.color = "rgb(2, 97, 197)";
    document.getElementById("recButton").classList.remove("pulsate");
  }
}

function blockUser() {
  document.getElementById("blockUserOverlay").classList.add("showBlockUserOverlay");
  document.getElementById("blockUserOverlay").classList.remove("hideBlockUserOverlay");
  waitingForDownload = true;
}

function unBlockUser() {
  document.getElementById("blockUserOverlay").classList.add("hideBlockUserOverlay");
  document.getElementById("blockUserOverlay").classList.remove("showBlockUserOverlay");
  waitingForDownload = false;
}

function writeInfoOnCanvas() {
  noStroke();
  fill(color(0, 0, 0));
  text('Clustering iteration number: '+clusterIterationNumber+' '+
        (clusteringConverged ? '(converged!)':'')+'\n'+
       'Prune treshold: '+pruneTresholdValue+'\n'+
       'Inflation: '+inflationValue,
       0.03*width, 0.03*height);
}
