// Hyperparameters
let populationLifespan = 100; // initial lifespan of population (will naturally increase if fitness is not improving)
let lifespanRate = 0.1;       // if fitness isn't improving, rate at which lifespan is increased
let populationSize = 100;     // fixed population size
let maxForce = 0.8;           // maximum force/acceleration allowed per tick
let dampenVelocityRate = 0.99;// rate that velocity is dampened per tick
let pruneSaveRate = 0.4;      // while pruning population between generations, probability that a below-average individual will be saved for next generation
let pruneMutateRate = 0.01;   // while pruning, probability that a saved individual may be mutated
let mutationRate = 0.03;      // when a new child individual is created, probability that a gene will mutate
let stuckPenaltyDivisor = 5;  // fitness is divided by this when bubble hits wall or obstacle

// Minimum canvas size
let minWidth = 600;
let minHeight = 600;

// Global simulation vars
let population;         // population of individuals
let target;             // target "goal" point of individuals
let rectangles = [];    // rectangular obstacles
let controls = {};      // play/pause/render controls
let render = true;      // global render flag
let setupPhase = true;  // true during intiial setup phase

/**
 * Setup canvas and simulation
 */
function setup() {
  createCanvas(windowWidth < minWidth ? minWidth : windowWidth, windowHeight < minHeight ? minHeight : windowHeight);
  population = new Population(populationLifespan, populationSize, mutationRate, pruneSaveRate, pruneMutateRate, lifespanRate);
  target = createVector(width - 100, 100);

  // Initial obstacle
  let cX = width / 2, cY = height / 2, cW = 30, cH = height / 4;
  rectangles.push(new ShapePolygon([[cX - cW, cY - cH], [cX + cW, cY - cH], [cX + cW, cY + cH], [cX - cW, cY + cH]]));

  // Controls
  let x = width - 100, y = 10;
  controls.play = new ShapePolygon([[x, y], [x + 15, y + 10], [x, y + 20]]);
  controls.pause = new ShapeGroup([
    new ShapePolygon([[x, y], [x + 6, y], [x + 6, y + 20], [x, y + 20]]),
    new ShapePolygon([[x + 9, y], [x + 15, y], [x + 15, y + 20], [x + 9, y + 20]])
  ]);
  let rX = x + 38, rY = y + 10;
  controls.render = new ShapeGroup([
    new ShapeEllipse(rX, rY, 30, 16),
    new ShapeEllipse(rX, rY, 12, 12, 0)
  ]);
  let sX = rX + 22, sY = y + 20;
  controls.renderStats = new ShapePolygon([[sX, sY], [sX + 10, sY - 13], [sX + 13, sY - 8], [sX + 20, sY - 20], [sX + 30, sY - 15], [sX + 30, sY]]);
}

/**
 * Handle mouse clicks
 */
function mouseClicked() {
  if ((population.paused && controls.play.inBounds(mouseX, mouseY))
    || (!population.paused && controls.pause.inBounds(mouseX, mouseY))) {
    population.togglePause();
    if (setupPhase) {
      setupPhase = false;
      population.renderInfo = true;
    }
  } else if (controls.render.inBounds(mouseX, mouseY)) {
    render = population.toggleRender();
  } else if (population.render && controls.renderStats.inBounds(mouseX, mouseY)) {
    population.toggleRenderStats();
  }

  // During setup phase only
  if (!setupPhase) {
    return;
  }

  // Remove obstacle if ctrl-click
  if (!keyIsDown(CONTROL)) {
    return;
  }
  let removeIndex;
  if (rectangles.some((r, index) => {
    if (r.inBounds(mouseX, mouseY)) {
      removeIndex = index;
      return true;
    }
  })) {
    rectangles.splice(removeIndex, 1);
  }
}

// Holds currently drawing obstacle during setup phase
let currentRect = {};

/**
 * Start drawing obstacle in setup phase
 */
function mousePressed() {
  if (!setupPhase) {
    return;
  }
  currentRect.x = mouseX;
  currentRect.y = mouseY;
}

/**
 * Draw obstacles in setup phase
 */
function mouseDragged() {
  if (!setupPhase || !currentRect.x) {
    return;
  }
  currentRect.w = mouseX - currentRect.x;
  currentRect.h = mouseY - currentRect.y;
}

/**
 * Complete drawing, save obstacle
 */
function mouseReleased() {
  if (!setupPhase || !currentRect.x) {
    return;
  }
  let r = currentRect;
  rectangles.push(new ShapePolygon([[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]]));
  currentRect = {};
}

/**
 * Render canvas and tick simulation
 */
function draw() {
  background(0);

  // Draw controls
  push();
  fill(255, 255, 255);
  cursor(setupPhase ? (keyIsDown(CONTROL) ? HAND : CROSS) : ARROW);
  if (population.paused) {
    controls.play.draw();
    if (controls.play.inBounds(mouseX, mouseY)) {
      cursor(HAND);
    }
  } else {
    controls.pause.draw();
    if (controls.pause.inBounds(mouseX, mouseY)) {
      cursor(HAND);
    }
  }
  controls.render.draw();
  if (controls.render.inBounds(mouseX, mouseY)) {
    cursor(HAND);
  }
  if (render) {
    controls.renderStats.draw();
    if (controls.renderStats.inBounds(mouseX, mouseY)) {
      cursor(HAND);
    }
  }
  if (setupPhase) {
    textAlign(CENTER);
    text("Draw some obstacles on the canvas, then click play on the right!\n\nHold down CTRL + click to remove obstacles.\n\nThe bubbles will try to reach the green goal using a genetic algorithm.", 0, 24, width);
  }
  pop();

  // Run simulation
  if (!population.run()) {
    population.regenerate();
  }

  if (!render) {
    return;
  }
  
  // Draw target
  push();
  fill(20, 200, 100, 100);
  ellipse(target.x, target.y, 20, 20);
  ellipse(target.x, target.y, 30, 30);
  ellipse(target.x, target.y, 40, 40);

  // Draw obstacles
  noStroke();
  fill(150, 50, 50);
  rectangles.forEach(function (r) {
    r.draw();
  });
  if (currentRect.w) {
    stroke(150, 100, 100);
    fill(150, 50, 50, 100);
    rect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
  }
  pop();
}








function DNA(lifespan, mutationRate, randomize) {
  this.genes = [];
  this.mutationRate = mutationRate === undefined ? 0.02 : mutationRate;

  let randomGene = function () {
    return p5.Vector.random2D().limit(maxForce);
  };

  // Randomly generate genes for new DNA
  if (randomize !== false) {
    for (var i = 0; i < lifespan; i++) {
      this.genes[i] = randomGene();
    }
  }

  this.getGene = function (tick) {
    if (tick >= this.genes.length) {
      // Generate a random new gene if DNA is not long enough
      this.genes[tick] = randomGene();
    }
    return this.genes[tick];
  }

  /**
   * Cross this DNA with a partner DNA
   * Randomly chooses midpoint and uses left or right side of split genes from each parent respectively
   */
  this.crossover = function (lifespan, mutationRate, partner) {
    let newDna = new DNA(lifespan, mutationRate, false);
    var mid = floor(random(this.genes.length));
    for (var i = 0; i < lifespan; i++) {
      if (i > mid && i < this.genes.length) {
        // Use gene from this parent
        newDna.genes[i] = this.genes[i];
      } else if (i < partner.genes.length) {
        // Use gene from partner
        newDna.genes[i] = partner.genes[i];
      } else {
        // This child has more genes than parents, randomly generate
        newDna.genes[i] = randomGene();
      }
    }
    return newDna;
  }

  /**
   * Randomly mutates genes, given a mutation rate chance
   */
  this.mutate = function () {
    let count = 0;
    for (let i = 0; i < this.genes.length; i++) {
      if (random(1) < this.mutationRate) {
        this.genes[i] = randomGene();
        count++;
      }
    }
    return count;
  }
}      








function Individual(lifespan, mutationRate, dna) {
  this.radius = 15;
  this.dna = dna ? dna : new DNA(lifespan, mutationRate);
  this.pos;
  this.vel;
  this.acc;
  this.fitness;
  this.tickCompleted;
  this.tickStuck;
  this.mutationCount = 0;

  /**
   * Resets individual with starting values
   */
  this.reset = function () {
    this.pos = createVector(100, height - 100);
    this.vel = createVector();
    this.acc = createVector();
    this.fitness = 0.0;
    this.tickCompleted = null;
    this.tickStuck = null;
  };

  // Reset newly created individuals
  this.reset();

  /**
   * Mate this individual with a partner, mutate it, and return a new child individual
   */
  this.mate = function (lifespan, mutationRate, partner) {
    let newDna = this.dna.crossover(lifespan, mutationRate, partner.dna);
    let mutationCount = newDna.mutate();
    let child = new Individual(lifespan, mutationRate, newDna);
    child.mutationCount += mutationCount;
    return child;
  }

  /**
   * Calculate the fitness for this individual based on distance to target and time taken to reach target
   */
  this.calcFitness = function () {

    let dFit = 1000 / Math.max(1, dist(this.pos.x, this.pos.y, target.x, target.y));
    if (this.tickCompleted) {
      // Individual arrived at goal, use best time to calculate fitness
      let tFit = pow((1 + (1 / this.tickCompleted)), 2);
      this.fitness = dFit * tFit;
      return;
    }

    // Still finding path
    this.fitness = dFit;

    if (this.tickStuck) {
      // Individual stuck, penalty
      this.fitness /= stuckPenaltyDivisor;
      return;
    }
  }

  /**
   * Update individual this tick simulation
   */
  this.update = function (tick) {
    
    if (this.tickCompleted || this.tickStuck) {
      return;
    }

    let d = dist(this.pos.x, this.pos.y, target.x, target.y);
    if (d < this.radius) {
      this.tickCompleted = tick;
      return;
    }
    
    // Check for screen edge & obstacle collisions
    if (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height
      || rectangles.some((r) => r.inBounds(this.pos.x, this.pos.y), this)) {
        // Collision detected, set velocity to 0
        this.vel.mult(0);
        this.acc.mult(0);
        this.tickStuck = tick;
        return;
    }

    // Add acceleration vector and update velocity/position
    this.acc.add(this.dna.getGene(tick));
    this.vel.mult(dampenVelocityRate); // dampen velocity
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  /**
   * Draw individual to screen
   */
  this.draw = function () {
    let color = this.tickStuck ? [255, 50, 50, 50] :
      (this.tickCompleted ? [20, 200, 100, 100] :
      [50, 100, 200, 100]);
    push();
    fill(color);
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    rectMode(CENTER);
    ellipse(0, 0, this.radius * 2, this.radius * 2);
    pop();
  }
}









function Population(lifespan, popsize, mutationRate, pruneSaveRate, pruneMutateRate, lifespanRate) {
  this.individuals = [];
  this.popsize = popsize === undefined ? 0 : popsize;
  this.lifespan = lifespan === undefined ? 100 : lifespan;
  this.lifespanRate = lifespanRate === undefined ? 0.1 : lifespanRate;
  this.mutationRate = mutationRate === undefined ? 0.02 : mutationRate;
  this.pruneSaveRate = pruneSaveRate === undefined ? 0.5 : pruneSaveRate;
  this.pruneMutateRate = pruneMutateRate === undefined ? 0.01 : pruneMutateRate;
  this.tick = 0;
  this.totalFitness = 0;
  this.maxFitness = 0;
  this.minFitness = Infinity;
  this.paused = true;
  this.render = true;
  this.renderInfo = false;
  this.renderStats = false;
  this.generation = 1;
  this.newChildren = this.popsize;
  this.previousMaxFitness = 0;
  this.previousMinFitness = 0;
  this.previousTotalFitness = 0;
  this.mutationCount = 0;
  this.totalGenes = 0;
  this.bestOverallFitness = 0;
  this.highestOverallTotalFitness = 0;
  this.maxOverallMutations = 0;
  this.stats = [];

  if (popsize > 0) {
    for (var i = 0; i < this.popsize; i++) {
      this.individuals[i] = new Individual(this.lifespan, this.mutationRate);
    }
  }

  /**
   * Pauses/unpauses simulation
   */
  this.togglePause = function () {
    this.paused = !this.paused;
    return this.paused;
  };

  /**
   * Turns on/off simulation rendering
   */
  this.toggleRender = function () {
    this.render = !this.render;
    return this.render;
  }
  
  /**
   * Turns on/off rendering of generation info
   */
  this.toggleRenderInfo = function () {
    this.renderInfo = !this.renderInfo;
    return this.renderInfo;
  }

  /**
   * Turns on/off rendering of stats
   */
  this.toggleRenderStats = function () {
    this.renderStats = !this.renderStats;
    return this.renderStats;
  }

  /**
   * Calculates the fitness for each individual in the population
   */
  this.calcFitness = function () {
    this.totalFitness = 0;
    this.maxFitness = 0;
    this.minFitness = Infinity;
    let countDone = 0;
    let lastTick = 0;
    this.individuals.forEach(function (individual) {
      individual.calcFitness();

      // Check if individual has reached target or is stuck
      if (individual.tickCompleted || individual.tickStuck) {
        countDone++;
        if (individual.tickCompleted > lastTick) {
          lastTick = individual.tickCompleted;
        } else if (individual.tickStuck > lastTick) {
          lastTick = individual.tickStuck;
        }
      }

      // Update population fitness stats
      this.totalFitness += individual.fitness;
      if (individual.fitness > this.maxFitness) {
        this.maxFitness = individual.fitness;
      }
      if (individual.fitness < this.minFitness) {
        this.minFitness = individual.fitness;
      }
    }, this);

    // If all individuals were done, decrease population lifespan to last tick
    if (countDone >= this.individuals.length) {
      this.lifespan = max(lastTick, 10);
    }
  };

  /**
   * Prunes population
   * Save individual for next generation if they have above average fitness, or they are randomly kept given the pruneSaveRate
   * Randomly mutate saved individuals based on pruneMutateRate
   */
  this.prune = function () {
    let newIndividuals = [];
    let meanFitness = this.totalFitness / this.popsize;
    this.totalFitness = 0;
    this.individuals.forEach(function (individual) {
      if (individual.fitness > meanFitness
        || random(1) < this.pruneSaveRate) {
        // Save individuals with above average fitness, or chance to save those below average
        this.totalFitness += individual.fitness;
        if (random(1) < this.pruneMutateRate) {
          // Chance to mutate existing individuals
          this.mutationCount += individual.dna.mutate();
        }
        newIndividuals.push(individual);
      }
    }, this);
    this.individuals = newIndividuals;
  };

  /**
   * Mates two parents, creates a new child and adds to population
   */
  this.addNewChild = function (parentA, parentB) {
    let newChild = parentA.mate(this.lifespan, this.mutationRate, parentB);
    this.mutationCount += newChild.mutationCount;
    this.individuals.push(newChild);
  };

  /**
   * Regenerate population and prepare next generation
   */
  this.regenerate = function () {

    // Calculate the fitness of all individuals
    this.calcFitness();

    // Increment to next generation
    this.generation++;
    if (this.totalFitness > this.highestOverallTotalFitness) {
      this.highestOverallTotalFitness = this.totalFitness;
    }
    if (this.maxFitness > this.bestOverallFitness) {
      this.bestOverallFitness = this.maxFitness;
    } else {
      // Increase population lifespan if fitness didn't improve
      this.lifespan += min(floor(this.lifespan * this.lifespanRate), 100);
    }
    this.previousMaxFitness = this.maxFitness;
    this.previousMinFitness = this.minFitness;
    this.previousTotalFitness = this.totalFitness;
    this.tick = 0;
    this.mutationCount = 0;

    // Prune population, allowing for new children
    this.prune();

    // Randomly pick an array of parents from remaining population
    let pairings = [];
    this.newChildren = this.popsize - this.individuals.length;
    for (let i = 0; i < this.newChildren; i++) {
      pairings.push({
        a: random(0, this.totalFitness),
        b: random(0, this.totalFitness)
      });
    }

    // Choose parents: those with higher fitness have a higher probability of being chosen
    // when both parents are found, mate them and add child to population
    this.individuals.forEach(function (individual) {
      pairings.forEach(function (pairing) {
        if (pairing.done) {
          return;
        }
        pairing.a -= individual.fitness;
        pairing.b -= individual.fitness;
        if (pairing.a <= 0) {
          pairing.parentA = individual;
          if (pairing.parentB) {
            this.addNewChild(pairing.parentA, pairing.parentB);
            pairing.done = true;
            return;
          }
        }
        if (pairing.b <= 0) {
          pairing.parentB = individual;
          if (pairing.parentA) {
            this.addNewChild(pairing.parentA, pairing.parentB);
            pairing.done = true;
            return;
          }
        }
      }, this);

      this.totalGenes = this.individuals.reduce((acc, curr) => acc + curr.dna.genes.length, 0);
      if (this.mutationCount > this.maxOverallMutations) {
        this.maxOverallMutations = this.mutationCount;
      }

      // Reset this individual in prep for next generation
      individual.reset();

    }, this);

    // Save this generation's statistics
    this.saveStats();
  };

  /**
   * Main simulation loop
   */
  this.run = function () {

    let paused = this.paused;

    // Run updates on each individual if not paused, and draw (if rendering)
    this.individuals.forEach(function (individual) {
      if (!paused) {
        individual.update(this.tick);
      }
      if (this.render) {
        individual.draw();
      }
    }, this);

    // Increment tick if not paused
    if (!paused) {
      this.tick++;
      if (this.tick >= this.lifespan) {
        return false;
      }
    }

    if (this.render) {
      // Draw generation info and stats to canvas
      if (this.renderInfo) {
        this.drawInfo();
      }
      if (this.renderStats) {
        this.drawStats();
      }
    } else {
      // If not currently rendering simulation, just display current generation in center of screen
      push();
      textAlign(CENTER);
      textSize(32);
      textStyle(BOLD);
      fill(200, 200, 200, 255);
      text("Generation " + this.generation, 0, height / 2, width);
      textSize(16);
      text("Fitness " + this.maxFitness.toFixed(2), 0, height / 2 + 70, width);
      text("Tick " + this.tick + " / " + this.lifespan, 0, height / 2 + 40, width);
      pop();
    }

    return true;
  };

  /**
   * Save this generation's stats to historical stat array
   */
  this.saveStats = function () {
    let prev = (this.generation > 0 ? this.generation - 1 : 0);

    // Previous generation
    if (!(prev in this.stats)) {
      this.stats[prev] = {
        lifespan: this.lifespan,
        newChildren: this.popsize,
        popsize: this.popsize
      };
    }
    this.stats[prev].mutations = this.mutationCount;
    this.stats[prev].totalFitness = this.totalFitness;
    this.stats[prev].minFitness = this.minFitness;
    this.stats[prev].maxFitness = this.maxFitness;

    this.stats[this.generation] = {
      lifespan: this.lifespan,
      newChildren: this.newChildren,
      popsize: this.popsize
    };
  };

  /**
   * Draws historical stat chart in lower-right side of canvas
   */
  this.drawStats = function () {
    push();

    let w = 400, h = 150, x = width - w, y = height;
    let xStep = w / this.stats.length;
    let fitnessStep = h / this.bestOverallFitness;
    let totalFitnessStep = h / this.highestOverallTotalFitness;
    let mutationStep = h / this.maxOverallMutations;
    let colors = {
      totalFitness: [255, 255, 255],
      maxFitness: [20, 200, 100],
      minFitness: [255, 50, 50],
      mutations: [120, 120, 255]
    }
    textAlign(RIGHT);
    fill(colors.totalFitness);
    text("Total fitness (0 - " + ceil(this.highestOverallTotalFitness) + ")", x, y - h - 60, w - 10);
    fill(colors.maxFitness);
    text("Max fitness (0 - " + ceil(this.bestOverallFitness) + ")", x, y - h - 45, w - 10);
    fill(colors.minFitness);
    text("Min fitness (0 - " + ceil(this.bestOverallFitness) + ")", x, y - h - 30, w - 10);
    fill(colors.mutations);
    text("Mutations (0 - " + ceil(this.maxOverallMutations) + ")", x, y - h - 15, w - 10);
    let prev = {
      x: x,
      maxFitness: y,
      minFitness: y,
      totalFitness: y,
      mutations: y
    };
    let next;
    this.stats.forEach(function (stat, gen) {
      next = {
        x: x + (xStep * gen),
        maxFitness: y - (fitnessStep * stat.maxFitness),
        minFitness: y - (fitnessStep * stat.minFitness),
        totalFitness: y - (totalFitnessStep * stat.totalFitness),
        mutations: y - (mutationStep * stat.mutations)
      }
      stroke(colors.totalFitness);
      line(prev.x, prev.totalFitness, next.x, next.totalFitness);
      stroke(colors.maxFitness);
      line(prev.x, prev.maxFitness, next.x, next.maxFitness);
      stroke(colors.minFitness);
      line(prev.x, prev.minFitness, next.x, next.minFitness);
      stroke(colors.mutations);
      line(prev.x, prev.mutations, next.x, next.mutations);
      Object.assign(prev, next);
    });

    pop();
  };

  this.drawInfo = function () {
    let infoPairs = [
      ["Generation:", this.generation],
      ["Tick: ", this.tick + " / " + this.lifespan],
      ["New children:", this.newChildren + " / " + this.popsize],
      ["Mutations:", this.mutationCount + " / " + this.totalGenes],
      ["\nLast generation:", "\n" + (this.generation > 0 ? this.generation - 1 : 0)],
      ["Total fitness:", this.previousTotalFitness.toFixed(2)],
      ["Min fitness:", this.previousMinFitness.toFixed(2)],
      ["Max fitness:", this.previousMaxFitness.toFixed(2)],
      ["\nBest overall fitness:", "\n" + this.bestOverallFitness.toFixed(2)],
    ];

    let left = "";
    let right = "";
    infoPairs.forEach(function (curr) {
      left += curr[0] + "\n";
      right += curr[1] + "\n";
    });

    let x = 10, y = 20, w = 130;
    push();

    fill(200, 200, 200, 255);
    textAlign(RIGHT);
    text(left, x, y, w);
    textAlign(LEFT);
    text(right, x + w, y, w);

    pop();
  }
}








function ShapeEllipse(x, y, w, h, color) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h === undefined ? w : h;
  this.color = color;
  this.rectBounds = {
    x: Infinity,
    y: Infinity,
    x1: 0,
    y1: 0
  };

  let halfW = this.w / 2.0;
  let halfH = this.h / 2.0;
  this.rectBounds.x = this.x - halfW;
  this.rectBounds.y = this.y - halfH;
  this.rectBounds.x1 = this.x + halfW;
  this.rectBounds.y1 = this.y + halfH;

  this.draw = function () {
    if (this.color !== undefined) {
      push();
      fill(color);
    }
    ellipse(this.x, this.y, this.w, this.h);
    if (this.color !== undefined) {
      pop();
    }
  }

  this.inBounds = function (x, y) {
    return (x >= this.rectBounds.x && x <= this.rectBounds.x1 && y >= this.rectBounds.y && y <= this.rectBounds.y1);
  }
}









function ShapeGroup(polygons) {
  this.polygons = polygons;
  this.rectBounds = {
    x: Infinity,
    y: Infinity,
    x1: 0,
    y1: 0
  };

  this.polygons.forEach(function (polygon) {
    // Save bounding box limits
    if (polygon.rectBounds.x < this.rectBounds.x) {
      this.rectBounds.x = polygon.rectBounds.x;
    } else if (polygon.rectBounds.x1 > this.rectBounds.x1) {
      this.rectBounds.x1 = polygon.rectBounds.x1;
    }
    if (polygon.rectBounds.y < this.rectBounds.y) {
      this.rectBounds.y = polygon.rectBounds.y;
    } else if (polygon.rectBounds.y1 > this.rectBounds.y1) {
      this.rectBounds.y1 = polygon.rectBounds.y1;
    }
  }, this);

  this.draw = function () {
    this.polygons.forEach(function (polygon) {
      polygon.draw();
    });
  }

  this.inBounds = function (x, y) {
    return (x >= this.rectBounds.x && x <= this.rectBounds.x1 && y >= this.rectBounds.y && y <= this.rectBounds.y1);
  }
}









function ShapePolygon(points) {
  this.points = points;
  this.lines = [];
  this.rectBounds = {
    x: Infinity,
    y: Infinity,
    x1: 0,
    y1: 0
  };

  let prev = null;
  this.points.forEach(function (point) {
    if (prev !== null) {
      this.lines.push([prev, point]);
    }
    prev = point;

    // Save bounding box limits
    if (point[0] < this.rectBounds.x) {
      this.rectBounds.x = point[0];
    } else if (point[0] > this.rectBounds.x1) {
      this.rectBounds.x1 = point[0];
    }
    if (point[1] < this.rectBounds.y) {
      this.rectBounds.y = point[1];
    } else if (point[1] > this.rectBounds.y1) {
      this.rectBounds.y1 = point[1];
    }
  }, this);

  this.draw = function () {
    beginShape();
    this.points.forEach(function (points) {
      vertex(points[0], points[1]);
    });
    endShape(CLOSE);
  }

  this.inBounds = function (x, y) {
    return (x >= this.rectBounds.x && x <= this.rectBounds.x1 && y >= this.rectBounds.y && y <= this.rectBounds.y1);
  }
}
