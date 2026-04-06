function stamp(level, message, meta) {
  const prefix = `[${new Date().toISOString()}] [${level}]`;
  if (meta) {
    console.log(prefix, message, meta);
    return;
  }
  console.log(prefix, message);
}

module.exports = {
  info: (message, meta) => stamp('INFO', message, meta),
  warn: (message, meta) => stamp('WARN', message, meta),
  error: (message, meta) => stamp('ERROR', message, meta),
};
