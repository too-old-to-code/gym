function Placeholder({ title }: { title: string }) {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontSize: "8vw" }}>
      <h1>{title}</h1>
    </main>
  );
}

export const StrengthAPlaceholder = () => <Placeholder title="Strength A" />;
export const CrossFit1 = () => <Placeholder title="CrossFit 1" />;
export const Rehab1 = () => <Placeholder title="Rehab 1" />;
