export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Full technical detail stays in the server console.
    console.error(
      `[validate] ${req.method} ${req.originalUrl} failed:`,
      JSON.stringify(result.error.issues, null, 2)
    );

    // The client only gets one plain, readable sentence.
    const message =
      result.error.issues[0]?.message || "Please check the data you entered.";

    return res.status(400).json({ success: false, message });
  }

  req.body = result.data;
  next();
};
