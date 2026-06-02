
UPDATE procedimientos SET procedimiento_md = $$Desde **sedestación**, con pies descalzos y rodillas extendidas, el alumno realiza una **flexión máxima de tronco**, deslizando con ambas manos una señal por una superficie centimetrada (cajón diseñado *ad hoc*).

Se mide desde el valor 0 hasta el lugar al que lleguen ambas manos (positivo o negativo). Se toma **el mejor de dos intentos**.$$ WHERE prueba='wells';

UPDATE procedimientos SET procedimiento_md = $$**Test de Thomas modificado** (Peeler & Anderson, 2008) orientado a identificar limitaciones de flexores de cadera, control lumbopélvico y asimetrías.

El sujeto se sitúa sobre una **superficie elevada en tendido supino**, con todo el cuerpo apoyado salvo la mitad distal de los muslos y las piernas, suspendidas con flexión de rodillas. Desde ahí flexiona una cadera atrayendo el muslo hacia el tórax con las manos.

Se comprueba si la cadera contraria se flexiona involuntariamente y/o si existe extensión espontánea de la rodilla.

- Si **no ocurre** → puntuación **1**
- Si **ocurre** → puntuación **2**

Se repite con la otra pierna.$$ WHERE prueba='thomas';

UPDATE procedimientos SET procedimiento_md = $$**Test abdominal 1 minuto** (Cuadrado et al., 2009).

Desde **tendido supino con rodillas flexionadas** y pies bajo un soporte (o sujetos por un compañero), se realiza **flexión bilateral de tronco de forma continua durante 60 segundos**.

Se anota el número de repeticiones logrado en un único intento.$$ WHERE prueba='abdominales_60';

UPDATE procedimientos SET procedimiento_md = $$**Prueba de Biering-Sørensen** (Martínez-Romero et al., 2020). Valora la resistencia isométrica de los extensores del tronco y el mantenimiento postural.

El sujeto se sitúa en **camilla en tendido prono**, con la cadera al borde sobre la cresta iliaca anterosuperior, **sujetado con cinchas**. A la señal, mantiene la posición horizontal mediante extensión paravertebral, con las manos cruzadas por delante y el raquis cervical neutro.

Se anotan los **segundos** que se mantiene en estatismo, sin oscilaciones ni temblores derivados de la fatiga.$$ WHERE prueba='biering_sorensen';

UPDATE procedimientos SET procedimiento_md = $$**Test de salto libre de Sargent** (Sargent, 1921).

Desde **bipedestación bipodal** con pies a la anchura de los hombros, el alumno **flexiona un hombro** hasta alcanzar la mayor altura posible marcada en una regleta de la pared. A continuación, realiza un salto vertical mediante rápida flexo-extensión de rodillas y, con la mano dominante, toca la regleta a la máxima altura alcanzada.

Se contabiliza la **diferencia (cm)** entre la posición inicial (hombro en flexión) y la altura alcanzada en el salto.$$ WHERE prueba='salto_vertical';

UPDATE procedimientos SET procedimiento_md = $$**Squat Jump (Bosco & Komi, 1979)**.

Desde **bipedestación bipodal** con pies a distancia biacromial y **manos en la cadera**, se realiza flexión de rodillas hasta **90°** y, tras **4 segundos estáticos**, se ejecuta un **salto vertical** sin contramovimiento.

Medido con plataforma de contacto (Chronojump).$$ WHERE prueba='sj';

UPDATE procedimientos SET procedimiento_md = $$**Counter Movement Jump (Bosco & Komi, 1979)**.

Desde la misma posición inicial que el SJ (pies a distancia biacromial, **manos en la cadera**), se realiza un **salto libre con contramovimiento** mediante flexo-extensión de rodillas.

La comparación SJ vs CMJ permite diferenciar la fuerza explosiva concéntrica del aprovechamiento del ciclo estiramiento-acortamiento (índice elástico).

Medido con plataforma de contacto (Chronojump).$$ WHERE prueba='cmj';

UPDATE procedimientos SET procedimiento_md = $$**Lanzamiento de balón medicinal sobre hombros** (Cuadrado et al., 2009).

Desde **bipedestación bipodal** con pies a distancia biacromial, **tras una línea**, se realiza un lanzamiento de balón medicinal (**3 kg chicas, 5 kg chicos**) con **ambos brazos**, ayudado de una extensión de raquis.

Se mide desde la línea hasta la **huella más cercana** del balón.$$ WHERE prueba='lanz_hombros';

UPDATE procedimientos SET procedimiento_md = $$**Lanzamiento rotacional unilateral con balón medicinal** (Hardy et al., 2025). Mismo peso que en EFIT (3 kg chicas, 5 kg chicos).

Desde **bipedestación bipodal**, con pies separados a **1,5 × distancia biacromial**, tras realizar una **rotación de tronco y flexión de rodillas**, se deshace el movimiento en sentido contrario con una **rápida extensión articular** lanzando el balón.

Se realiza **por ambos lados (derecha e izquierda)** y se mide desde la línea hasta la **huella más cercana** del balón.$$ WHERE prueba='lanz_med';

UPDATE procedimientos SET procedimiento_md = $$**Aceleración 50 metros** (Cuadrado et al., 2009).

Desde **bipedestación bipodal con un pie adelantado**, posición de **tres apoyos**, con la mano de apoyo sobre un **pulsador** (Chronojump). A la señal del investigador, el alumno sale separando la mano del pulsador (activa el tiempo) y pasa por **dos fotocélulas** a la máxima velocidad posible.

Medición con fotocélulas inalámbricas WICHRO (Chronojump).$$ WHERE prueba='sprint_50';

UPDATE procedimientos SET procedimiento_md = $$**Carrera de 30 m**. Procedimiento idéntico al sprint EFIT salvo por la **menor distancia** (Vicente-Rodríguez et al., 2011).

Desde **bipedestación bipodal con un pie adelantado** en **tres apoyos**, con la mano de apoyo sobre el **pulsador** (Chronojump). A la señal, el alumno sale separando la mano del pulsador y pasa por **dos fotocélulas** a máxima velocidad.

Medición con fotocélulas inalámbricas WICHRO (Chronojump).$$ WHERE prueba='sprint_30';

UPDATE procedimientos SET procedimiento_md = $$**Test de Cooper** (Bandyopadhyay, 2015).

Los participantes realizan una **carrera de 12 minutos ininterrumpidos** a la **máxima velocidad media posible**, contabilizando el número de metros recorridos.

Al término, se insta al alumnado a **quedarse en posición estática** para contabilizar los metros adicionales con respecto a la salida.$$ WHERE prueba='cooper';

UPDATE procedimientos SET procedimiento_md = $$**Test de la milla / Rockport**.

Consiste en recorrer **1609 m caminando lo más rápido posible**, registrando el **tiempo final** y la **frecuencia cardiaca** al finalizar mediante brazalete (Moofit) y software Pulsemonitor.

A partir del tiempo, la FC, el sexo, la edad y el peso, se estima el **VO₂ máx** mediante la **ecuación de Kline** (validada en edad escolar; McSwegin et al., 1998), valor con el que se asigna la nota.$$ WHERE prueba='rockport';
