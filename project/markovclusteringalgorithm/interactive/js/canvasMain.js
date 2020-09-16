let nodes = math.matrix();
let nodeRadius = 5;
let pressedNodeId = [];
let releasedNodeId = [];
let isMakingNewEdge = false;
let isMovingNode = false;
let isDeletingNode = false;
let edges = math.matrix([0]);
let clusteredEdges;
let canonicalTransitionMatrix;
let clusteringBegan = false;
let graphMovement = 'relaxed'; // 'motionless' 'relaxed'
let inflationValue = 2;
let pruneTresholdValue = 1;
let clusterizationSpeedValue = 1;
let clusteringRunning = false;
let nodeToNodeRepulsionFactor = 0.6;
let nodeToNodeAttractionFactor = 2;
let nodeToCenterAttractionFactorX = 0;
let nodeToCenterAttractionFactorY = 0;
let dampingFactor = 0.15;
let nodesVelocity = math.matrix();
let randomForce = math.matrix();
let clusteringConverged = false;
let clusterIterationNumber = 0;
let isRecording = false;
let gif;
let waitingForDownload = false;
let targetFrameRate = 30;
let segregationMethod = 'standard'; // 'standard' or 'regularized'
let editTipsIsOpened = false;
let graphExploded = false;

function setup() {
  var canvas = createCanvas(parseFloat(select('#sketch-holder').style('width')), parseFloat( select('#sketch-holder').style('height')));
  canvas.parent('sketch-holder');
  frameRate(targetFrameRate);
  pruneTresholdValue = document.getElementById("pruneTresholdValue").value;
  inflationValue = document.getElementById("inflationValue").value;
};

function draw() {
  background(color('hsl(180, 37%, 79%)'));
  if(!graphExploded){
    if(graphMovement === 'relaxed') relaxGraph();
    if(clusteringRunning && !clusteringConverged && frameCount%math.round(10/clusterizationSpeedValue) === 0) stepClustering();
    drawNodes();
    drawEdges();
    writeInfoOnCanvas();
  }
  checkIfGraphExploded();
  if(isRecording) gif.addFrame(document.getElementById('defaultCanvas0'), {copy:true, delay: 1000/targetFrameRate});
};

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
        deleteNode(pressedNodeId);
      } else { // No key pressed
        isMakingNewEdge = true;
      }
    }
  }
}

function mouseReleased() {
  if(!clusteringBegan && !waitingForDownload && !isDeletingNode){
    if (mouseIsOnCanvas() && isMakingNewEdge) {
      releasedNodeId = getNodeId(mouseX, mouseY);
      if (pressedNodeId != releasedNodeId) {
        edges.set([pressedNodeId, releasedNodeId], 1);
        edges.set([releasedNodeId, pressedNodeId], 1);

      }
    }
  }
  pressedNodeId = [];
  releasedNodeId = [];
  isMovingNode = false;
  isMakingNewEdge = false;
  isDeletingNode = false;
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

function mouseIsOnCanvas() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    if(editTipsIsOpened) {
      if(mouseY > 192) {
        return true;
      } else if(mouseX <= width-224) {
        return true;
      } else if(mouseX <= width-192 && mouseY > 48){
        return true;
      } else {
        return false;
      }
    } else {
        if(mouseY > 48) {
          return true;
        } else if(mouseX <= width-32) {
          return true;
        } else {
          return false;
        }
      }
  } else {
    return false;
  }
}
