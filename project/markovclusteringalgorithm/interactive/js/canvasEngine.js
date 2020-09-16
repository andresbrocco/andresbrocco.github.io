function relaxGraph(){
  if(nodes.size()[0] > 1 && !isMovingNode){ // Need more than 1 node to relax and cant be moving a node
    if(frameCount%5 === 0){ // Skip some calculations to save processor
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

      nodeToCenterAttractionFactorX = math.max(0, nodeToCenterAttractionFactorX +(farthestNodeDistToCenterX-0.35)/sqrt(nodes.size()[0]));
      nodeToCenterAttractionFactorY = math.max(0, nodeToCenterAttractionFactorY +(farthestNodeDistToCenterY-0.35)/sqrt(nodes.size()[0]));
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
  canonicalTransitionMatrix = math.add(edges, math.identity(edges.size()[0]));
  canonicalTransitionMatrix = math.dotDivide(canonicalTransitionMatrix, canonicalTransitionMatrix.colSum().broadcast()) ; // Renormalize
  clusteredEdges = canonicalTransitionMatrix;
  clusteringBegan = true;
  clusterIterationNumber = 0;
}

function stepClustering() {
  if(!clusteringBegan){
    beginClustering();
  }
  let newClusteredEdges = clusteredEdges;
  if(segregationMethod == 'standard') {newClusteredEdges = math.multiply(newClusteredEdges, newClusteredEdges);} // Segregate
  else if(segregationMethod == 'regularized') {newClusteredEdges = math.multiply(newClusteredEdges, canonicalTransitionMatrix);} // Segregate
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
    logMatrix(newClusteredEdges);
  }
  clusteredEdges = newClusteredEdges;
  clusterIterationNumber++;
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


function checkIfGraphExploded() {
  if(nodes.size()[0]>1 && math.max(nodes)>2) {
    graphExploded = true;
    noStroke();
    fill(color(0, 0, 0));
    textSize(26);
    text('Congratulations, you have found the bug of the simulator!', width/6, height/2);
    textSize(12);
    fill(color('rgba(0, 0, 0, 0.5)'));
    text('In fact, you reached the mode of vibration of the system kkkkkk', width/3, 7*height/12);
  }
}
