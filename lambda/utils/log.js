let currentNamespace = "";

const setNamespace = (namespace, level = 0) => {
  let parts = [];

  if (currentNamespace.length) {
    parts = currentNamespace.split("/");
  }

  parts[level] = namespace;
  parts.splice(level + 1);

  currentNamespace = parts.join("/");
};

const clearNamespace = (level) => {
  const parts = currentNamespace.split("/");
  parts.splice(level);
  currentNamespace = parts.join("/");
};

const log = (...messages) => {
  console.log(
    `[Streamer${currentNamespace ? `/${currentNamespace}` : ""}] `,
    ...messages
  );
};

module.exports = { setNamespace, clearNamespace, log };
