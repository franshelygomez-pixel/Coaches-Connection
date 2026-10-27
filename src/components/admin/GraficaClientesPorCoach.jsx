import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function GraficaClientesPorCoach({ datos }) {
  if (datos.length === 0) {
    return (
      <p style={{ color: "#888", padding: "40px 0", textAlign: "center" }}>
        No hay entrenadores activos
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height: "300px", minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "#888" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#888" }} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #E5E5E5", fontSize: "13px" }}
            formatter={(valor) => [valor, "Clientes"]}
          />
          <Bar dataKey="clientes" fill="#FFC800" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
