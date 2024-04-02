class Vector {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
  }

  iadd(x, y) {
    this.x += x;
    this.y += y;
  }

  imul(x, y) {
    this.x *= x;
    this.y *= y;
  }

  idiv(x, y) {
    this.x /= x;
    this.y /= y;
  }

  /**
   * Make into a unit vector, will fail for zero length vectors,
   */
  normalize() {
    let m = this.length();
    this.idiv(m, m);
  }

  /**
   * Return a normalized copy of this vector
   * @returns {Vector}
   */
  normalized() {
    let m = this.length();
    return new Vector(v.x / m, v.y / m);
  }

  /**
   * @returns {number}
   */
  squared_length() {
    return dot(this, this);
  }

  /**
   * @returns {number}
   */
  length() {
    return Math.sqrt(this.squared_length());
  }
}

/**
 * @param {Vector} a
 * @param {Vector} b
 * @returns {number}
 */
function squared_distance(a, b) {
  let v = new Vector(a.x - b.x, a.y - b.y);
  return v.squared_length();
}

/**
 * @param {Vector} a
 * @param {Vector} b
 * @returns {number}
 */
function distance(a, b) {
  return Math.sqrt(squared_distance(a,b));
}

/**
 * Return 1.0 for positive numbers and -1 for negative
 * @param {number} x
 * @returns {number}
 */
function sign(x) {
  if (x < 0.0) {
    return -1.0;
  } else {
    return 1.0;
  }
}

/**
 * Linear interpolate between a & b using weight w
 * @param {Vector} a
 * @param {Vector} b
 * @param {number} w
 * @returns {Vector}
 */
function lerp(a, b, w) {
  return new Vector(a.x + w*(b.x - a.x), a.y + w*(b.y - a.y));
}

/**
 * Dot product of two 2D vectors,
 * @param {Vector} a
 * @param {Vector} b
 * @returns {number}
 */
function dot(a, b) {
  return (a.x * b.x) + (a.y * b.y);
}

/**
 * Return v reflected over n, n should be normalized.
 * @param {Vector} v
 * @param {Vector} n
 * @returns {Vector}
 */
function reflect(v, n) {
  let r = 2.0 * dot(v, n);
  return new Vector(v.x - r * n.x, v.y - r * n.y);
}

class Circle {
  /**
   * @param {Vector} position
   * @param {number} radius
   */
  constructor (position, radius) {
    this.position = position;
    this.radius = radius;
  }

  /**
   * Check if point is inside circle
   * @returns {boolean}
   */
  contains(point) {
    return squared_distance(point, this.position) <= (this.radius*this.radius);
  }
}

/**
 * Line segment
 */
class Line {
  /**
   * @param {Vector} a
   * @param {Vector} b
   */
  constructor (a, b) {
    this.a = a;
    this.b = b;
  }

  /** 
   * Get the distance between this line segment and point p
   * @param {Vector} p
   * @returns {number}
   */
  distance_to_point(p) {
    let a = new Vector(this.b.x - this.a.x, this.b.y - this.a.y);
    let b = new Vector(p.x - this.a.x, p.y - this.a.y);

    // project the point onto the line segment
    let t = saturate(dot(b, a) / a.squared_length());

    let c = lerp(this.a, this.b, t);
    return distance(p, c);
  }
}

/** 
 * Get intersection of two line segments
 * https://en.wikipedia.org/wiki/Intersection_(geometry)#Two_line_segments
 * @param {Line} l0
 * @param {Line} l1
 * @returns {{hit: boolean, pos: Vector}}
 */
function line_intersects_line(l0, l1) {
  let t = ((l0.a.x - l1.a.x) * (l1.a.y - l1.b.y) - (l0.a.y - l1.a.y) * (l1.a.x - l1.b.x)) /
          ((l0.a.x - l0.b.x) * (l1.a.y - l1.b.y) - (l0.a.y - l0.b.y) * (l1.a.x - l1.b.x)); 

  let u = -(((l0.a.x - l0.b.x) * (l0.a.y - l1.a.y) - (l0.a.y - l0.b.y) * (l0.a.x - l1.a.x)) /
            ((l0.a.x - l0.b.x) * (l1.a.y - l1.b.y) - (l0.a.y - l0.b.y) * (l1.a.x - l1.b.x)));

  // return the point of intersection, else return a zero point
  if ((0.0 <= t) && (t <= 1.0) && (0.0 <= u) && (u <= 1.0)) {
    return {hit: true, pos: lerp(l0.a, l0.b, t)};
  }

  return {hit: false, pos: new Vector(0.0, 0.0)};
}

/**
 * Check that if line segment l intersects circle c
 * https://mathworld.wolfram.com/Circle-LineIntersection.html
 * @param {Line} l
 * @param {Circle} c
 * @returns {{hit: boolean, pos: Vector}}
 */
function line_intersects_circle(l, c) {
  if (c.contains(l.a) || l.distance_to_point(c.position) > c.radius) {
    return {hit: false, pos: new Vector(0.0, 0.0)};
  }

  let a = new Vector(l.a.x - c.position.x, l.a.y - c.position.y);
  let b = new Vector(a.x - (l.b.x - c.position.x), a.y - (l.b.y - c.position.y));

  let dr = b.squared_length();

  // cross or perpendicular cross
  let d = a.x * b.y - b.x * a.y;
  let discriminant = (c.radius * c.radius * dr) - (d*d);

  if (discriminant > 0.0) {
    let s = Math.sqrt(discriminant);
    let i = new Vector((d * b.y + sign(b.y) * b.x * s) / dr, (-d * b.x + Math.abs(b.y) * s) / dr);
    let adist = squared_distance(a, i);

    let j = new Vector((d * b.y - sign(b.y) * b.x * s) / dr, (-d * b.x - Math.abs(b.y) * s) / dr);
    let bdist = squared_distance(b, j);

    if (adist < bdist) {
      i.iadd(c.position.x, c.position.y);
      return {hit: true, pos: i};
    } else {
      j.iadd(c.position.x, c.position.y);
      return {hit: true, pos: j};
    }
  } else {
    return {hit: false, pos: new Vector(0.0, 0.0)};
  }
}

/** 
 * Clamp number x between 0 and 1
 * @param {number} x
 * @returns {number}
 */
function saturate(x) {
  return Math.max(0.0, Math.min(1.0, x));
}

const UP = new Vector(0, -1);
const DOWN = new Vector(0, 1);
const LEFT = new Vector(-1, 0);
const RIGHT = new Vector(1, 0);

/**
 * Check line intersection against a rounded rectangle.
 * We do this by checking each side extruded by radius as a line line intersection, 
 * then testing each corner as a line circle intersection.
 * @param {Line} line
 * @param {Vector} pos
 * @param {Vector} size
 * @param {number} radius
 */
function line_intersects_roundrect(line, pos, size, radius) {
  let line_dir = new Vector(line.a.x - line.b.x, line.a.y - line.b.y);
  line_dir.normalize();

  // check against each extruded side of the rectangle,
  if (dot(line_dir, UP) > 0.0) {
    let top = new Line(
      new Vector(pos.x, pos.y - radius),
      new Vector(pos.x + size.x, (pos.y + size.y) - radius)
    );
    let hit_top = line_intersects_line(line, top);
    if (hit_top.hit) {
      return {hit: true, pos: hit_top.pos, normal: UP};
    }
  }
  if (dot(line_dir, DOWN) > 0.0) {
    let bottom = new Line(
      new Vector(pos.x, pos.y + radius),
      new Vector(pos.x + size.x, pos.y + size.y + radius)
    );
    let hit_bottom = line_intersects_line(line, bottom);
    if (hit_bottom.hit) {
      return {hit: true, pos: hit_bottom.pos, normal: DOWN};
    }
  }
  if (dot(line_dir, LEFT) > 0.0) {
    let left = new Line(
      new Vector(pos.x - radius, pos.y),
      new Vector(pos.x - radius, pos.y + size.y)
    );
    let hit_left = line_intersects_line(line, left);
    if (hit_left.hit) {
      return {hit: true, pos: hit_left.pos, normal: LEFT};
    }
  }
  if (dot(line_dir, RIGHT) > 0.0) {
    let right = new Line(
      new Vector(pos.x + radius, pos.y),
      new Vector(pos.x + radius, pos.y + size.y)
    );
    let hit_right = line_intersects_line(line, right);
    if (hit_right.hit) {
      return {hit: true, pos: hit_right.pos, normal: RIGHT};
    }
  }

  // create a circle for the corner, we will mutate this circle for each corner.
  let corner = new Circle(new Vector(pos.x, pos.y), radius);
  let hit = line_intersects_circle(line, corner);
  if (hit.hit) {
    return {hit: true, pos: hit.pos, normal: new Vector(-0.707, -0.707)};
  }

  corner.position.iadd(size.x, 0.0);
  hit = line_intersects_circle(line, corner);
  if (hit.hit) {
    return {hit: true, pos: hit.pos, normal: new Vector(0.707, -0.707)};
  }

  corner.position.iadd(0.0, size.y);
  hit = line_intersects_circle(line, corner);
  if (hit.hit) {
    return {hit: true, pos: hit.pos, normal: new Vector(0.707, 0.707)};
  }

  corner.position.iadd(-size.x, 0.0);
  hit = line_intersects_circle(line, corner);
  if (hit.hit) {
    return {hit: true, pos: hit.pos, normal: new Vector(-0.707, 0.707)};
  }

  return {hit: false, pos: new Vector(0,0)};
}

// https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Desktop_with_gamepad
const GamepadAPI = {
  active: false,
  controller: {},
  connect(event) {
    // https://developer.mozilla.org/en-US/docs/Web/API/GamepadEvent/gamepad
    GamepadAPI.controller = event.gamepad;
    GamepadAPI.active = true;
    console.log(`Connected controller ${GamepadAPI.controller.id} ${GamepadAPI.controller.index}`);
    console.log(event.gamepad);
  },
  disconnect(event) {
    delete GamepadAPI.controller;
    GamepadAPI.active = false;
  },
  update() {
    GamepadAPI.buttons.cache = [];
    for (let k = 0; k < GamepadAPI.buttons.status.length; k++) {
      GamepadAPI.buttons.cache[k] = GamepadAPI.buttons.status[k];
    }
    GamepadAPI.buttons.status = [];

    // this, is what was missing from the guide.
    // https://github.com/luser/gamepadtest/blob/0230a5439ab57ee16a4d5eb8cc5cd83a384af325/gamepadtest.js#L103
    // Found that the gamepad test site worked but nothing ever happened in my code. running on safari...
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i].id === GamepadAPI.controller.id) {
        GamepadAPI.controller = gamepads[i];
      }
    }
    const c = GamepadAPI.controller || {};
    const pressed = [];
    if (c.buttons) {
      for (let b = 0; b < c.buttons.length; b++) {
        // Here I will deviate from the example also, and opt for just storing if buttons were
        // pressed.
        pressed.push(c.buttons[b].pressed);
      }
    }
    const axes = [];
    if (c.axes) {
      for (let a = 0; a < c.axes.length; a++) {
        axes.push(c.axes[a].toFixed(2));
        // console.log(c.axes[a]);
      }
    }
    GamepadAPI.axes.status = axes;
    GamepadAPI.buttons.status = pressed;
    return pressed;
  },
  buttons: {
    // TODO: I guess layout must get values set from the gamepad mappings
    layout: [],
    cache: [],
    status: [],
    pressed(button, state) {
      // TODO: this does not work safari using my stadia controller
      let newPress = false;
      for (let i = 0; i < GamepadAPI.buttons.status.length; i++) {
        if (GamepadAPI.buttons.status === button) {
          newPress = true;
          if (!hold) {
            for (let j = 0; j < GamepadAPI.buttons.cache.length; j++) {
              if (GamepadAPI.buttons.cache[j] === button) {
                newPress = false;
              }
            }
          }
        }
      }
      return newPress;
    },
  },
  axes: {
    status: [],
  },
};

class Brick {
  /**
   * @param {Vector} pos
   * @param {number} hp
   * @param {Vector} color
   */
  constructor(pos, hp, color) {
    this.pos = pos;
    this.hp = hp;
    this.color = color;
  }
};

;(() => {
  let pre_frame = new Date();

  let ball_pos = new Vector(320, 380);
  let ball_dir = new Vector(-1.0, -1.0);
  const ball_radius = 5.0;
  const ball_speed = 0.3;

  const brick_size = new Vector(30, 10);
  const bricks = new Array(20 * 8);
  let n = 0;
  for (i = 0; i < 8; i++) {
    for (j = 0; j < 20; j++) {
      let p = new Vector(j * (brick_size.x + 2) + 1, i * (brick_size.y + 2) + 60);
      let c = new Vector(j * Math.floor(255 / 20), i * Math.floor(255 / 8));
      bricks[n] = new Brick(p, 1, c);
      n += 1;
    }
  }

  let has_hit = false;
  let ball_held = true;

  let player_hp = 3;

  // Position for the upper left corner of player
  const paddle_speed = 0.5;
  const paddle_size = new Vector(48.0, 10.0);
  let paddle_pos = new Vector(320 - paddle_size.x, 420);

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
      ball_held = false;
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

  window.addEventListener("gamepadconnected", GamepadAPI.connect);
  window.addEventListener("gamepaddisconnected", GamepadAPI.disconnect);

  function main() {
    let cur_frame = new Date();
    let dt = (cur_frame - pre_frame);
    pre_frame = cur_frame;

    if (GamepadAPI.active) {
      GamepadAPI.update();

      if (GamepadAPI.axes.status) {
        paddle_pos.x += (paddle_speed * GamepadAPI.axes.status[0]) * dt;
      }

      if (GamepadAPI.buttons.status[0]) {
        ball_held = false;
      }

    // fallback to using keyboard
    } else {
      if (left) {
        paddle_pos.x -= paddle_speed * dt;
      } else if (right) {
        paddle_pos.x += paddle_speed * dt;
      }
    }

    // clamp player position so we don't go out of bounds,
    paddle_pos.x = Math.min(Math.max(paddle_pos.x, 0), 640 - paddle_size.x);

    ball_dir.normalize();

    let prev_ball_pos = {...ball_pos};

    // update ball position,
    if (!ball_held) {
      ball_pos.x += (ball_speed * dt) * ball_dir.x;
      ball_pos.y += (ball_speed * dt) * ball_dir.y;
    } else {
      // player is holding the ball, so just have it follow the paddle,
      ball_pos.x = paddle_pos.x + paddle_size.x * 0.5;
      ball_pos.y = paddle_pos.y - ball_radius - 1;
    }

    let ball_trajectory = new Line(prev_ball_pos, ball_pos);

    if (!ball_held) {
      bricks.forEach((brick) => {
        if (brick.hp > 0 && !has_hit) {
          let collision_check = line_intersects_roundrect(
            ball_trajectory,
            brick.pos,
            brick_size,
            ball_radius
          );
          if (collision_check.hit) {
            has_hit = true;
            ball_pos.set(collision_check.pos.x, collision_check.pos.y);
            ball_dir = reflect(ball_dir, collision_check.normal);
            brick.hp -= 1;
          }
        }
      });
    }
    has_hit = false;

    // collision to boundary top 
    if (ball_pos.y - ball_radius <= 0) {
      ball_dir.y *= -1;
    }

    // if the ball hit bottom we lose a round and reset the ball
    if (ball_pos.y + ball_radius >= 480) {
      player_hp -= 1;
      ball_held = true;
      ball_dir.x = 0.707 * sign(ball_dir.x);
      ball_dir.y = -0.707;
    }

    // collision to sides
    if (ball_pos.x + ball_radius >= 640 || ball_pos.x - ball_radius <= 0) {
      ball_pos.x = Math.min(Math.max(ball_pos.x, ball_radius), 640 - ball_radius);
      ball_dir.x *= -1;
    }

    if (!ball_held) {
      let paddle_check = line_intersects_roundrect(
        ball_trajectory,
        paddle_pos,
        paddle_size,
        ball_radius
      );
      if (paddle_check.hit) {
        ball_dir = reflect(ball_dir, paddle_check.normal);
        ball_pos.set(paddle_check.pos.x, paddle_check.pos.y);
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
        if (brick.hp > 0) {
          ctx.fillStyle = `rgb(${brick.color.x} ${brick.color.y} 100)`;
          ctx.fillRect(brick.pos.x, brick.pos.y, brick_size.x, brick_size.y);
        }
      });

      // draw the ball
      ctx.beginPath();
      ctx.fillStyle = "rgb(255 255 255)";
      ctx.arc(ball_pos.x, ball_pos.y, ball_radius, 0, Math.PI*2);
      ctx.fill();

      // draw the player
      ctx.fillStyle = "rgb(241 220 237)";
      ctx.fillRect(paddle_pos.x, paddle_pos.y, paddle_size.x, paddle_size.y);
    }
    window.requestAnimationFrame(main);
  }
  main();
})();
