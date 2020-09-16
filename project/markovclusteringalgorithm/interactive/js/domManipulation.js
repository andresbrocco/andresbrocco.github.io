$(document).ready(function() {
    const $inflationSpan = $('.inflationSpan');
    const $inflationValue = $('#inflationValue');
    $inflationSpan.html($inflationValue.val());
    $inflationValue.on('input change', () => { $inflationSpan.html($inflationValue.val()); setInflationValue($inflationValue.val())});

    const $pruneTresholdSpan = $('.pruneTresholdSpan');
    const $pruneTresholdValue = $('#pruneTresholdValue');
    $pruneTresholdSpan.html($pruneTresholdValue.val());
    $pruneTresholdValue.on('input change', () => { $pruneTresholdSpan.html($pruneTresholdValue.val()); setPruneTresholdValue($pruneTresholdValue.val())});

    const $clusterizationSpeedSpan = $('.clusterizationSpeedSpan');
    const $clusterizationSpeedValue = $('#clusterizationSpeedValue');
    $clusterizationSpeedSpan.html($clusterizationSpeedValue.val());
    $clusterizationSpeedValue.on('input change', () => { $clusterizationSpeedSpan.html($clusterizationSpeedValue.val()); setClusterizationSpeed($clusterizationSpeedValue.val())});
  }
);

function editPencilButtonClicked() {
  document.getElementById('editTips').classList.toggle('is-closed');
  editTipsIsOpened = !editTipsIsOpened;
}

function motionlessCheckboxChanged() {
  if(document.getElementById('motionlessCheckbox').checked) {
    graphMovement = 'fixed';
  } else {
    graphMovement = 'relaxed';
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

function setSegregationMethod(value) {
  segregationMethod = value;
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
