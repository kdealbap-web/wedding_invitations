/**
 * La entrada a la iglesia: quién entra, con quién, en qué orden y con qué
 * música. Lo pasó Kevin tal cual lo acordaron con la wedding.
 *
 * Está en su propio módulo porque lo usan dos: `export-ceremonia` lo dibuja
 * para imprimir y `guion-dj` se lleva las dos canciones del violín, para que la
 * playlist del DJ tenga TODA la música de la noche aunque esas dos no las
 * ponga él.
 *
 * EL ORDEN DEL ARREGLO ES EL ORDEN DE ENTRADA. No hay campo «posición» a
 * propósito: si mañana cambia quién entra antes, se mueve la línea y ya.
 *
 * `izq` y `der` son los dos lados del pasillo mirando al altar, que es como lo
 * ensayan. Una entrada sin `der` es alguien que entra solo.
 */

// Las dos piezas del violín. En la iglesia no toca el DJ —y por eso el guion de
// la recepción decía «el DJ no interviene»—, pero la música existe y alguien
// tiene que tenerla escrita.
export const MUSICA_CEREMONIA = [
  'A Thousand Years · Christina Perri (violín)',
  'Marcha Nupcial · Mendelssohn (violín)',
]

export const ENTRADA = [
  {
    izq: 'Osiris Pomarico',  rolIzq: 'Mamá del novio',
    der: 'Kevin De Alba',    rolDer: 'El novio',
    tipo: 'Pareja',
    // La música arranca aquí y no para hasta que entra la novia
    musica: MUSICA_CEREMONIA[0],
  },
  {
    izq: 'Estela Marys Rodríguez', rolIzq: 'Mamá de la novia',
    der: 'Fredy De Alba',          rolDer: 'Papá del novio',
    tipo: 'Pareja',
  },
  {
    izq: 'Jessica Rojas', der: 'Janner De Alba',
    tipo: 'Pareja', rol: 'Padrinos',
  },
  {
    izq: 'Dianis Navas', der: 'Jostin Rojas',
    tipo: 'Pareja', rol: 'Dama y caballero',
  },
  {
    izq: 'Yuranis De Alba', der: 'Fernando López',
    tipo: 'Pareja', rol: 'Dama y caballero',
  },
  {
    izq: 'Valentina De Alba', der: 'Jonathan Zapateiro',
    tipo: 'Pareja', rol: 'Dama y caballero',
  },
  {
    izq: 'Megan Donado', der: 'Daniel Echavarría',
    tipo: 'Pareja', rol: 'Dama y caballero',
  },
  {
    izq: 'Ithiel Zamora',
    tipo: 'Niño', rol: 'Lleva el letrero',
    // Lo que dice el letrero va en la pieza: es lo que se ve desde los bancos y
    // lo que hay que escribir bien la primera vez.
    letrero: 'Aquí viene el amor de tu vida',
  },
  {
    izq: 'Nicoll Acuña', der: 'María Fernanda De Alba',
    tipo: 'Pareja', rol: 'Entran con la canasta de pétalos',
  },
  {
    izq: 'Daniel Díaz',
    tipo: 'Entra solo',
    // Vino sin pareja y sin encargo en la lista que pasó Kevin. Se imprime tal
    // cual: inventarle un papel sería peor que dejar la línea corta.
    rol: '',
  },
  {
    // La novia a la izquierda y el padre a la derecha, como todas las demás
    // líneas: en la lista que pasó Kevin la columna de la izquierda es la de
    // ellas. Del brazo entran igual.
    izq: 'Angely',          rolIzq: 'La novia',
    der: 'Gerson Gravini',  rolDer: 'Papá de la novia',
    tipo: 'Entrada principal',
    novia: true,
    musica: MUSICA_CEREMONIA[1],
  },
]
