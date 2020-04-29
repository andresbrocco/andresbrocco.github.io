$(document).ready(

  function() {
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
