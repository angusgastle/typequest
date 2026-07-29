export function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="float-slow absolute -top-20 -left-20 h-72 w-72 rounded-full bg-sunny/40 blur-3xl" />
      <div
        className="float-slow absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-coral/30 blur-3xl"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="float-slow absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-teal/30 blur-3xl"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="float-slow absolute top-10 right-1/3 h-40 w-40 rounded-full bg-grape/30 blur-3xl"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}
