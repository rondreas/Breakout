;(() => {
  let previousFrame = new Date();

  function dot(ax, ay, bx, by) {
    return ax * bx + ay * by;
  }

  // normalize the input,
  function normalize(vx, vy) {
    let length = Math.sqrt(dot(vx, vy, vx, vy));
    vx /= length;
    vy /= length;
  }

  // return new object with the normalized result,
  function normalized(vx, vy) {
    let length = Math.sqrt(dot(vx, vy, vx, vy));
    return {x: vx / length, y: vy / length};
  }

  function reflect(vx, vy, nx, ny) {
    let r = 2.0 * dot(vx, vy, nx, ny)
    let x = vx - r*nx;
    let y = vy - r*ny;
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
    let t = (ax-cx)*(cy-dy)-(ay-cy)*(cx-dx) / (ax-bx)*(cy-dy)-(ay-by)*(cx-dx);
    let u = -((ax-bx)*(ay-cy)-(ay-by)*(ax-cx) / (ax-bx)*(cy-dy)-(ay-by)*(cx-dx));
    if (0.0 <= t && t <= 1.0 && 0.0 <= u && u <= 1.0) {
      let hx = ax + t*(bx-ax);
      let hy = ay + t*(by-ay);
      return {hit: true, pos: {x: hx, y: hy}};
    }
    return {hit: false, pos: {x: 0.0, y: 0.0}};
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
  function raycastRoundedRectangle(px, py, dx, dy, rx, ry, rw, rh, rr) {
    let hitTop = lineLineIntersection(px, py, dx, dy, rx, ry-rr, rx+rw, ry-rr);
    let hitBottom = lineLineIntersection(px, py, dx, dy, rx, ry+rh, rx+rw, ry+rh+rr);
    let hitLeft = lineLineIntersection(px, py, dx, dy, rx-rr, ry, rx-rr, ry+rh);
    let hitRight = lineLineIntersection(px, py, dx, dy, rx+rw+rr, ry, rx+rw+rr, ry+rh);
  }

  const ballRadius = 5;
  let ballX = 320;
  let ballY = 380;

  let ballDirectionX = 4.0;
  let ballDirectionY = 4.0;

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
  }

  function keyUpHandler(event) {
    if (event.keyCode === 39) {
      right = false;
    } else if (event.keyCode === 37) {
      left = false;
    }
  }

  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);

  function main() {
    window.requestAnimationFrame(main);

    let currentFrame = new Date();

    if (left) {
      playerX -= 6;
    } else if (right) {
      playerX += 6;
    }

    // clamp player position so we don't go out of bounds,
    playerX = Math.min(Math.max(playerX, 0), 640-playerWidth);

    // update ball position,
    ballX += ballDirectionX;
    ballY += ballDirectionY;

    let projectedX = ballX + ballDirectionX;
    let projectedY = ballY + ballDirectionY;

    bricks.forEach((brick) => {
      // only check 'living' bricks
      if (brick.health > 0 && !hasHit) {
        if (pointInRectangle(ballX, ballY, brick.x, brick.y-ballRadius, brickWidth, ballRadius)) {
          ballDirectionY *= -1;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInRectangle(ballX, ballY, brick.x, brick.y+brickHeight, brickWidth, ballRadius)) {
          ballDirectionY *= -1;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInRectangle(ballX, ballY, brick.x-ballRadius, brick.y, ballRadius, brickHeight)) {
          ballDirectionX *= -1;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInRectangle(ballX, ballY, brick.x+brickWidth, brick.y, ballRadius, brickHeight)) {
          ballDirectionX *= -1;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInCircle(ballX, ballY, brick.x, brick.y, ballRadius)) {
          let r = reflect(ballDirectionX, ballDirectionY, -0.707, -0.707);
          ballDirectionX = r.x;
          ballDirectionY = r.y;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInCircle(ballX, ballY, brick.x+brickWidth, brick.y, ballRadius)) {
          let r = reflect(ballDirectionX, ballDirectionY, 0.707, -0.707);
          ballDirectionX = r.x;
          ballDirectionY = r.y;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInCircle(ballX, ballY, brick.x+brickWidth, brick.y+brickHeight, ballRadius)) {
          let r = reflect(ballDirectionX, ballDirectionY, 0.707, 0.707);
          ballDirectionX = r.x;
          ballDirectionY = r.y;
          brick.health -= 1;
          hasHit = true;
        } else if (pointInCircle(ballX, ballY, brick.x, brick.y+brickHeight, ballRadius)) {
          let r = reflect(ballDirectionX, ballDirectionY, -0.707, 0.707);
          ballDirectionX = r.x;
          ballDirectionY = r.y;
          brick.health -= 1;
          hasHit = true;
        } else {
        }
      }
    });
    hasHit = false;

    // collision to boundary top and bottom
    if (ballY + ballRadius >= 480 || ballY - ballRadius <= 0) {
      ballDirectionY *= -1;
    }

    // collision to sides
    if (ballX + ballRadius >= 640 || ballX - ballRadius <= 0) {
      ballDirectionX *= -1;
    }

    // collision to paddle
    // top
    if (pointInRectangle(ballX, ballY, playerX, playerY-ballRadius, playerWidth, ballRadius)) {
      ballDirectionY *= -1;
    // bottom
    } else if (pointInRectangle(ballX, ballY, playerX, playerY+playerHeight, playerWidth, ballRadius)) {
      ballDirectionY *= -1;
    // left
    } else if (pointInRectangle(ballX, ballY, playerX-ballRadius, playerY, ballRadius, playerHeight)) {
      ballDirectionX *= -1;
    // right
    } else if (pointInRectangle(ballX, ballY, playerX+playerWidth, playerY, ballRadius, playerHeight)) {
      ballDirectionX *= -1;
    } else if (pointInCircle(ballX, ballY, playerX, playerY, ballRadius)) {
      let r = reflect(ballDirectionX, ballDirectionY, -0.707, -0.707);
      ballDirectionX = r.x;
      ballDirectionY = r.y;
    } else if (pointInCircle(ballX, ballY, playerX+playerWidth, playerY, ballRadius)) {
      let r = reflect(ballDirectionX, ballDirectionY, 0.707, -0.707);
      ballDirectionX = r.x;
      ballDirectionY = r.y;
    } else if (pointInCircle(ballX, ballY, playerX, playerY+playerHeight, ballRadius)) {
      let r = reflect(ballDirectionX, ballDirectionY, -0.707, 0.707);
      ballDirectionX = r.x;
      ballDirectionY = r.y;
    } else if (pointInCircle(ballX, ballY, playerX+playerWidth, playerY+playerHeight, ballRadius)) {
      let r = reflect(ballDirectionX, ballDirectionY, 0.707, 0.707);
      ballDirectionX = r.x;
      ballDirectionY = r.y;
    } else {
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

      let fps = 1000 / (currentFrame - previousFrame);
      ctx.fillText(`fps: ${fps.toFixed(2)}`, 5, 20);
      previousFrame = currentFrame;

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
      ctx.fillStyle = "rgb(200 0 0)";
      ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
    }
  }

  main();
})();
