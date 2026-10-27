export function validarCedulaDominicana(cedula) {
  const limpio = (cedula || "").replace(/\D/g, "");
  if (limpio.length !== 11) return false;

  const pesos = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let indice = 0; indice < 10; indice += 1) {
    let producto = Number.parseInt(limpio[indice], 10) * pesos[indice];
    if (producto >= 10) producto -= 9;
    suma += producto;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === Number.parseInt(limpio[10], 10);
}

export function formatearCedula(valor) {
  const limpio = (valor || "").replace(/\D/g, "").slice(0, 11);
  const parte1 = limpio.slice(0, 3);
  const parte2 = limpio.slice(3, 10);
  const parte3 = limpio.slice(10, 11);

  let resultado = parte1;
  if (parte2) resultado += `-${parte2}`;
  if (parte3) resultado += `-${parte3}`;
  return resultado;
}

export function normalizarCorreo(correo) {
  return (correo || "").trim().toLowerCase();
}
