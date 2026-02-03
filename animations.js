import { animate, easeIn, easeOut, hover, press } from "motion";

const scanBtn = document.getElementById("scanBtn");

let filter = 0;

hover(scanBtn, (element) => {
  animate(element, {
    scale: 1.05,
    backgroundColor: "#000",
    color: "#fff",
    ease: easeOut,
  });

  animate(".border-background", {
    scale: 1.05,
    inset: "-3px",
    ease: easeOut,
  });

  animate(0, 10, {
    duration: 0.2,
    onUpdate: (latest) => {
      let filter = Math.round(latest);
      document.querySelector(
        ".border-background"
      ).style.filter = `blur(${filter}px)`;
    },
  });

  animate(0, 360, {
    duration: 0.4,
    ease: easeOut,
    onUpdate: (latest) => {
      let degree = Math.round(latest);
      document.querySelector(
        ".border-background"
      ).style.background = `conic-gradient(from ${degree}deg, red, orange, yellow, green, blue, purple)`;
    },
  }).finished.then(() => {
    animate(0, 360, {
      duration: 6,
      repeat: Infinity,
      ease: "linear",
      onUpdate: (latest) => {
        let degree = Math.round(latest);
        document.querySelector(
          ".border-background"
        ).style.background = `conic-gradient(from ${degree}deg, red, orange, yellow, green, blue, purple)`;
      },
    });
  });

  return () => {
    animate(element, {
      scale: 1,
      backgroundColor: "#fff",
      color: "#000",
      duration: 0.4,
    });

    animate(".border-background", {
      scale: 1,
      inset: "0px",
      duration: 0.4,
    });

    animate(10, 0, {
      duration: 0.4,
      onUpdate: (latest) => {
        filter = Math.round(latest);
        document.querySelector(
          ".border-background"
        ).style.filter = `blur(${filter}px)`;
      },
    });

    animate(360, 0, {
    duration: 0.4,
    ease: easeOut,
    onUpdate: (latest) => {
      let degree = Math.round(latest);
      document.querySelector(
        ".border-background"
      ).style.background = `conic-gradient(from ${degree}deg, red, orange, yellow, green, blue, purple)`;
    },
  })
  };
});

press(scanBtn, (element) => {
  animate(element, {
    scale: 0.9,
    backgroundColor: "#fff",
    color: "#000",
  });

  animate(".border-background", {
    scale: 0.9,
  });

  return () => {
    animate(element, {
      scale: 1.05,
      backgroundColor: "#000",
      color: "#fff",
    });

    animate(".border-background", {
      scale: 1.05,
    });
  };
});

const helpGroup = document.getElementById("help-group");
const helpPrompt = document.getElementById("help-prompt");
const helpText = document.getElementById("help-text");

hover(helpGroup, (helpPrompt) => {
  animate(helpPrompt, { color: "#676767ff" }, { duration: 0.2 });
  animate(helpText, { opacity: 1, duration: 0.2 });

  return () => {
    animate(helpPrompt, { color: "#FFF" }, { duration: 0.2 });
    animate(helpText, { opacity: 0, duration: 0.4, ease: easeIn });
  };
});
