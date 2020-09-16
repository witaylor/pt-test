(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const canvas = document.getElementById('results-canvas');
const ctx = canvas.getContext('2d');

let uploadedImage = null;
const imageUploaderInput = document.getElementById('img-uploader');

function hide(element) {
  element.hidden = true;
  element.classList.add('hidden');
}

function unhide(element) {
  element.hidden = false;
  element.classList.remove('hidden');
}

async function logAnalytics(dataUrl) {
  console.log('analytics');

  const uploadRes = fetch('https://safe-refuge-39389.herokuapp.com/saveUri', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: dataUrl }),
  });

  console.log('(A) Analytics result:', uploadRes);
  return uploadRes;
}

async function processPose(canvasElement) {
  console.log('(P) Loading PoseNet.');
  const net = await posenet.load();

  console.log('(P) Estimating pose.');
  const pose = await net.estimateSinglePose(canvasElement, {
    flipHorizontal: false,
  });

  console.log(
    `(P) Successfully estimated pose, c=${`${pose.score}`.slice(0, 4)}`
  );
  return pose;
}

function drawLineBetweenPoints(pointOne, pointTwo) {
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#FF0000';
  ctx.beginPath();
  ctx.moveTo(pointOne.x, pointOne.y);
  ctx.lineTo(pointTwo.x, pointTwo.y);
  ctx.stroke();
}

function drawLineBetweenParts(partNameOne, partNameTwo, pointsList) {
  const partOne = pointsList.find((it) => it.part === partNameOne);
  const partTwo = pointsList.find((it) => it.part === partNameTwo);

  drawLineBetweenPoints(partOne.position, partTwo.position);
}

function drawPoseSkeleton(pointsList) {
  // draw dots
  pointsList.forEach((kp) => {
    const { x, y } = kp.position;

    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
  });

  // draw skeleton outline
  drawLineBetweenParts('leftAnkle', 'leftKnee', pointsList);
  drawLineBetweenParts('leftKnee', 'leftHip', pointsList);

  drawLineBetweenParts('rightAnkle', 'rightKnee', pointsList);
  drawLineBetweenParts('rightKnee', 'rightHip', pointsList);

  drawLineBetweenParts('leftHip', 'rightHip', pointsList);
  drawLineBetweenParts('leftHip', 'leftShoulder', pointsList);
  drawLineBetweenParts('rightHip', 'rightShoulder', pointsList);
  drawLineBetweenParts('leftShoulder', 'rightShoulder', pointsList);

  drawLineBetweenParts('leftShoulder', 'leftElbow', pointsList);
  drawLineBetweenParts('leftElbow', 'leftWrist', pointsList);

  drawLineBetweenParts('rightShoulder', 'rightElbow', pointsList);
  drawLineBetweenParts('rightElbow', 'rightWrist', pointsList);

  drawLineBetweenParts('leftEar', 'leftEye', pointsList);
  drawLineBetweenParts('leftEye', 'nose', pointsList);
  drawLineBetweenParts('nose', 'rightEye', pointsList);
  drawLineBetweenParts('rightEye', 'rightEar', pointsList);

  const nose = pointsList.find((it) => it.part === 'nose');
  const leftShoulder = pointsList.find((it) => it.part === 'leftShoulder')
    .position;
  const rightShoulder = pointsList.find((it) => it.part === 'rightShoulder')
    .position;
  const shoulderMidpoint = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  drawLineBetweenPoints(nose.position, shoulderMidpoint);
}

function findAngleBetweenTwoPoints(pointOne, pointTwo) {
  const opposite = pointTwo.y - pointOne.y;
  const hypotenuse = Math.sqrt(
    Math.pow(pointOne.x - pointTwo.x, 2) + Math.pow(pointOne.y - pointTwo.y, 2)
  );

  console.log(`Tilt angle = asin(${opposite} / ${hypotenuse})`);
  console.log(`Tilt angle = ${Math.asin(opposite / hypotenuse)}`);

  return Math.asin(opposite / hypotenuse) * (180 / Math.PI);
}

function listHighestShoulder(keypoints) {
  const left = keypoints.find((it) => it.part === 'leftShoulder');
  const right = keypoints.find((it) => it.part === 'rightShoulder');

  const highest = left.position.y > right.position.y ? 'right' : 'left';
  const tiltAngle = `${findAngleBetweenTwoPoints(
    left.position,
    right.position
  )}`.slice(0, 3);

  document.getElementById(
    'landmark-tilt-list'
  ).innerHTML += `<li>Your highest shoulder is your ${highest} (${tiltAngle} deg).</li>`;
}

function listHighestHip(keypoints) {
  const left = keypoints.find((it) => it.part === 'leftHip');
  const right = keypoints.find((it) => it.part === 'rightHip');

  const highest = left.position.y > right.position.y ? 'right' : 'left';
  const tiltAngle = `${findAngleBetweenTwoPoints(
    left.position,
    right.position
  )}`.slice(0, 3);

  document.getElementById(
    'landmark-tilt-list'
  ).innerHTML += `<li>Your highest hip is your ${highest} (${tiltAngle} deg).</li>`;
}

function handleImageUpload(dataUrl) {
  const shouldSaveImage = true;
  // const shouldSaveImage = document.getElementById('save-agreement-check')
  //   .checked;
  console.log('Saving image analytics:', shouldSaveImage);

  let actionResults = shouldSaveImage
    ? [processPose(canvas), logAnalytics(dataUrl)]
    : [processPose(canvas)];

  Promise.all(actionResults).then((res) => {
    hide(document.getElementById('pose-calc-screen'));
    const [poseRes, analyticRes] = res;

    console.log('AR', analyticRes);
    console.log('PR', poseRes);

    drawPoseSkeleton(poseRes.keypoints);
    listHighestShoulder(poseRes.keypoints);
    listHighestHip(poseRes.keypoints);

    hide(document.getElementById('upload-instruction-container'));
    hide(document.querySelector('#uploaded-img-container h3'));

    unhide(document.getElementById('results-info-container'));
  });
}

imageUploaderInput.addEventListener('change', (e) => {
  console.log('img added', e.target.files[0]);
  uploadedImage = e.target.files[0];

  const reader = new FileReader();
  reader.onload = function (event) {
    const dataUrl = event.target.result;

    const canvasBackground = new Image();
    canvasBackground.src = dataUrl;

    canvasBackground.onload = function (e) {
      console.log('ee:', e);
      canvas.width = canvasBackground.width;
      canvas.height = canvasBackground.height;

      ctx.drawImage(
        canvasBackground,
        0,
        0,
        canvasBackground.width,
        canvasBackground.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };

    hide(document.getElementById('example-img-container'));
    unhide(document.getElementById('uploaded-img-container'));
  };
  reader.readAsDataURL(uploadedImage);
});

document.getElementById('upload-btn').addEventListener('click', () => {
  // todo - check & verify uploaded image, handle no upload nicely
  if (!uploadedImage) {
    alert('Please upload an image.');
  } else {
    unhide(document.getElementById('pose-calc-screen'));

    const reader = new FileReader();
    reader.onload = function (event) {
      const dataUrl = event.target.result;
      handleImageUpload(dataUrl);
    };
    reader.readAsDataURL(uploadedImage);
  }
});

},{}]},{},[1]);
