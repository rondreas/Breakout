// https://stackoverflow.com/a/50746409
function randomPointInCircle(radius) {
  let r = radius * Math.sqrt(Math.random());
  let theta = Math.random() * 2.0 * Math.PI;
  let x = r * Math.cos(theta);
  let y = r * Math.sin(theta);
  return {x: x, y: y};
}

;(() => {
  let previousFrame = new Date();

  function dot(ax, ay, bx, by) {
    return (ax * bx) + (ay * by);
  }

  function normalized(vx, vy) {
    let length = Math.sqrt(dot(vx, vy, vx, vy));
    return {x: vx / length, y: vy / length};
  }

  function reflect(vx, vy, nx, ny) {
    let v = normalized(vx, vy);
    let n = normalized(nx, ny);

    let r = 2.0 * dot(v.x, v.y, n.x, n.y)
    let x = v.x - r*n.x;
    let y = v.y - r*n.y;
    return {x: x, y: y};
  }

  function squaredDistance(ax, ay, bx, by) {
    return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  }

  function distance(ax, ay, bx, by) {
    return Math.sqrt(squaredDistance(ax, ay, bx, by));
  }

  function pointInCircle(px, py, cx, cy, cr) {
    return squaredDistance(px, py, cx, cy) <= (cr * cr);
  }

  function pointInRectangle(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= (rx + rw) && py >= ry && py <= (ry + rh);
  }

  // get intersection of two line segments,
  // https://en.wikipedia.org/wiki/Intersection_(geometry)#Two_line_segments
  function lineLineIntersection(ax, ay, bx, by, cx, cy, dx, dy) {
    let t = ((ax-cx)*(cy-dy)-(ay-cy)*(cx-dx)) / ((ax-bx)*(cy-dy)-(ay-by)*(cx-dx));
    let u = -(((ax-bx)*(ay-cy)-(ay-by)*(ax-cx)) / ((ax-bx)*(cy-dy)-(ay-by)*(cx-dx)));
    if ((0.0 <= t) && (t <= 1.0) && (0.0 <= u) && (u <= 1.0)) {
      let hx = ax + t*(bx-ax);
      let hy = ay + t*(by-ay);
      return {hit: true, pos: {x: hx, y: hy}};
    }
    return {hit: false, pos: {x: 0.0, y: 0.0}};
  }

  function saturate(x) {
    return Math.max(0.0, Math.min(1.0, x));
  }

  // Get the closest distance from point to line segment,
  // given the point px,py find the distance to the line segment
  // made of points l0x,l0y and l1x,l1y
  function pointLineSegmentDistance(px, py, l0x, l0y, l1x, l1y) {
    let ax = l1x - l0x;
    let ay = l1y - l0y;

    let bx = px - l0x;
    let by = py - l0y;

    let t = saturate(dot(bx, by, ax, ay) / dot(ax, ay, ax, ay));

    let cx = l0x + (t * ax);
    let cy = l0y + (t * ay);

    return distance(px, py, cx, cy);
  }

  function sgn(x) {
    if (x < 0.0) {
      return 0.0;
    } else {
      return 1.0;
    }
  }

  // https://mathworld.wolfram.com/Circle-LineIntersection.html
  function raycastCircle(px, py, dx, dy, cx, cy, cr) {
    // if the p->d distance to c is greater than radius, early out
    if (pointLineSegmentDistance(cx, cy, px, py, dx, dy) > cr) {
      return {hit: false, pos:{x: 0.0, y: 0.0}};
    }

    let dr = dot(dx, dy, dx, dy);
    let D = px*(py+dy)-(px+dx)*py;
    let discriminant = cr*cr*dr*dr-D*D;
    if (discriminant > 0.0) {
      let ax = (D*dy+sgn(dy)*dx*Math.sqrt(discriminant)) / (dr*dr);
      let ay = (-D*dx+Math.abs(dy)*Math.sqrt(discriminant)) / (dr*dr);
      let adist = squaredDistance(px, py, ax+cx, ay+cy);

      let bx = (D*dy-sgn(dy)*dx*Math.sqrt(discriminant)) / (dr*dr);
      let by = (-D*dx-Math.abs(dy)*Math.sqrt(discriminant)) / (dr*dr);
      let bdist = squaredDistance(px, py, bx+cx, by+cy);

      if (adist < bdist) {
        return {hit: true, pos:{x: ax+cx, y: ay+cy}};
      } else {
        return {hit: true, pos:{x: bx+cx, y: by+cy}};
      }

    } else {
      return {hit: false, pos:{x: 0.0, y: 0.0}};
    }
  }

  // get hit for ray dx, dy starting from point px, py in rect
  function raycastRectangle(px, py, dx, dy, rx, ry, rw, rh) {
    let hitTop = lineLineIntersection(px, py, dx, dy, rx, ry, rx+rw, ry);
    let hitBottom = lineLineIntersection(px, py, dx, dy, rx, ry+rh, rx+rw, ry+rh);
    let hitLeft = lineLineIntersection(px, py, dx, dy, rx, ry, rx, ry+rh);
    let hitRight = lineLineIntersection(px, py, dx, dy, rx+rw, ry, rx+rw, ry+rh);
  }

  // check intersection for extruded segments and corner circles,
  // return if we hit, and hit position and normal.
  function raycastRoundedRectangle(px, py, dx, dy, rx, ry, rw, rh, rr) {
    // check for hits against any of the line segments,
    let hitTop = lineLineIntersection(px, py, dx, dy, rx, ry-rr, rx+rw, ry-rr);
    if (hitTop.hit) {
      return {hit: true, pos: hitTop.pos, normal: {x: 0.0, y: -1.0}};
    }

    let hitBottom = lineLineIntersection(px, py, dx, dy, rx, ry+rh, rx+rw, ry+rh+rr);
    if (hitBottom.hit) {
      return {hit: true, pos: hitBottom.pos, normal: {x: 0.0, y: 1.0}};
    }

    let hitLeft = lineLineIntersection(px, py, dx, dy, rx-rr, ry, rx-rr, ry+rh);
    if (hitLeft.hit) {
      return {hit: true, pos: hitLeft.pos, normal: {x: -1.0, y: 0.0}};
    }

    let hitRight = lineLineIntersection(px, py, dx, dy, rx+rw+rr, ry, rx+rw+rr, ry+rh);
    if (hitRight.hit) {
      return {hit: true, pos: hitRight.pos, normal: {x: 1.0, y: 0.0}};
    }
    
    // check for hits on any corner,
    let topLeft = raycastCircle(px, py, dx, dy, rx, ry, rr);
    if (topLeft.hit) {
      return {hit: true, pos: topLeft.pos, normal: {x: -0.707, y: -0.707}};
    }

    let topRight = raycastCircle(px, py, dx, dy, rx+rw, ry, rr);
    if (topRight.hit) {
      return {hit: true, pos: topRight.pos, normal: {x: 0.707, y: -0.707}};
    }

    let bottomRight = raycastCircle(px, py, dx, dy, rx+rw, ry+rh, rr);
    if (bottomRight.hit) {
      return {hit: true, pos: bottomRight.pos, normal: {x: 0.707, y: 0.707}};
    }

    let bottomLeft = raycastCircle(px, py, dx, dy, rx, ry+rh, rr);
    if (bottomLeft.hit) {
      return {hit: true, pos: bottomLeft.pos, normal: {x: -0.707, y: 0.707}};
    }

    return {hit: false};
  }

  const randomRadius = 0.1;

  const ballRadius = 5.0;
  let ballX = 320;
  let ballY = 380;

  let ballDirectionX = -1.0;
  let ballDirectionY = -1.0;

  const ballSpeed = 0.3;

  // brick size,
  const brickWidth = 30;
  const brickHeight = 10;

  const bricks = new Array(20 * 8);
  let n = 0;
  for (i = 0; i < 8; i++) {
    for (j = 0; j < 20; j++) {
      bricks[n] = {
        x: j * (brickWidth+2) + 1,
        y: i * (brickHeight+2) + 60,
        health: 1,
        r: j * Math.floor(255 / 20),
        g: i * Math.floor(255 / 8)
      };
      n += 1;
    }
  }

  let hasHit = false;
  let ballHeld = true;

  let playerHealth = 3;

  const playerSpeed = 0.5;

  // player size,
  const playerWidth = 48;
  const playerHeight = 10;

  // Position for the upper left corner of player
  let playerX = 320 - playerWidth / 2;
  let playerY = 420;

  // User input,
  let right = false;
  let left = false;

  function keyDownHandler(event) {
    if (event.keyCode === 39) {
      right = true;
    } else if (event.keyCode === 37) {
      left = true;
    }

    // space keydown, we release the ball
    if (event.keyCode === 32) {
      ballHeld = false;
    }
  }

  function keyUpHandler(event) {
    if (event.keyCode === 39) {
      right = false;
    } else if (event.keyCode === 37) {
      left = false;
    }
  }

  console.log(`${distance(bricks[10].x, bricks[10].y, ballX, ballY)}`);

  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);

  function main() {
    window.requestAnimationFrame(main);

    let currentFrame = new Date();
    let deltaTime = (currentFrame - previousFrame);
    previousFrame = currentFrame;

    if (left) {
      playerX -= playerSpeed * deltaTime;
    } else if (right) {
      playerX += playerSpeed * deltaTime;
    }

    // clamp player position so we don't go out of bounds,
    playerX = Math.min(Math.max(playerX, 0), 640-playerWidth);

    let asdf = normalized(ballDirectionX, ballDirectionY);
    ballDirectionX = asdf.x;
    ballDirectionY = asdf.y;

    let previousBallX = ballX;
    let previousBallY = ballY;

    // update ball position,
    if (!ballHeld) {
      ballX += (ballSpeed * deltaTime) * ballDirectionX;
      ballY += (ballSpeed * deltaTime) * ballDirectionY;
    } else {
      // player is holding the ball, so just have it follow the paddle,
      ballX = playerX + playerWidth*0.5;
      ballY = playerY - ballRadius - 1;
    }

    let diffuse = randomPointInCircle(randomRadius);

    if (!ballHeld) {
      bricks.forEach((brick) => {
        if (brick.health > 0 && !hasHit) {
          let raycast = raycastRoundedRectangle(previousBallX, previousBallY, ballX, ballY, brick.x, brick.y, brickWidth, brickHeight, ballRadius);
          if (raycast.hit) {
            hasHit = true;

            // snap the ball to the hit location,
            ballX = raycast.pos.x;
            ballY = raycast.pos.y;

            let reflected_direction = reflect(ballDirectionX, ballDirectionY, raycast.normal.x, raycast.normal.y);
            ballDirectionX = reflected_direction.x;
            ballDirectionY = reflected_direction.y;

            brick.health -= 1;
          }
        }
      });
    }
    hasHit = false;

    // collision to boundary top 
    if (ballY - ballRadius <= 0) {
      ballDirectionY *= -1;
    }

    if (ballY + ballRadius >= 480) {
      playerHealth -= 1;
      ballHeld = true;

      ballDirectionX = 0.707 * sgn(ballDirectionX);
      ballDirectionY = -0.707;
    }

    // collision to sides
    if (ballX + ballRadius >= 640 || ballX - ballRadius <= 0) {
      ballDirectionX *= -1;
    }

    let paddle_raycast = raycastRoundedRectangle(
      previousBallX,
      previousBallY,
      ballX,
      ballY,
      playerX,
      playerY,
      playerWidth,
      playerHeight,
      ballRadius
    );

    if (!ballHeld) {
      if (paddle_raycast.hit) {

        // TODO: hitting corners, will snap it to the rectangle corner
        // not the hit location on the circle it seems.

        let reflected_direction = reflect(
          ballDirectionX,
          ballDirectionY,
          paddle_raycast.normal.x,
          paddle_raycast.normal.y
        );

        ballDirectionX = reflected_direction.x;
        ballDirectionY = reflected_direction.y;

        ballX = paddle_raycast.pos.x + ballDirectionX*0.01;
        ballY = paddle_raycast.pos.y + ballDirectionY*0.01;
      }
    }

    // drawing
    const canvas = document.getElementById("rt");
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");

      // clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw background, 
      const gradient = ctx.createLinearGradient(320, 0, 320, 480);
      gradient.addColorStop(0, "rgb(5 2 7)");
      gradient.addColorStop(1, "rgb(28 12 35)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 480);

      bricks.forEach(function(brick) {
        if (brick.health > 0) {
          ctx.fillStyle = `rgb(${brick.r} ${brick.g} 100)`;
          ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
        }
      });

      // draw the ball
      ctx.beginPath();
      ctx.fillStyle = "rgb(255 255 255)";
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI*2);
      ctx.fill();

      // draw the player
      ctx.fillStyle = "rgb(241 220 237)";
      ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
    }
  }

  main();
})();
