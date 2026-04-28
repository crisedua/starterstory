-- =========================================================
-- Seed: Pain Points LATAM con evidencia citada
-- Fuentes: Banco Mundial, CEPAL, BID, FAO, OMS, UNODC, OECD, Statista, GSMA
-- =========================================================
-- Solo siembra si la tabla está vacía (idempotente).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pain_points) THEN

    INSERT INTO pain_points (title, category, description, severity, evidence) VALUES

    -- 1. Inclusión financiera
    ('Exclusión financiera y bancarización informal',
     'fintech',
     'Cerca de la mitad de los adultos en LATAM no tiene cuenta bancaria o usa servicios financieros muy limitados, lo que bloquea el acceso a crédito, ahorro formal y pagos digitales. La informalidad laboral (~50% de la fuerza laboral) profundiza el problema porque excluye a quienes no tienen historial formal de ingresos.',
     9,
     '[
       {"source": "Banco Mundial — Global Findex 2021", "url": "https://www.worldbank.org/en/publication/globalfindex", "claim": "73% de adultos en LATAM tiene cuenta bancaria, frente a 96% en economías de altos ingresos; persisten ~26% sin cuenta."},
       {"source": "BID — Microfinanzas en LATAM", "url": "https://www.iadb.org/es/sectores/instituciones-para-el-desarrollo/microfinanzas", "claim": "Más de 50% de la fuerza laboral es informal, lo que dificulta el scoring crediticio tradicional."},
       {"source": "CEPAL — Panorama Social 2023", "url": "https://www.cepal.org/es/publicaciones/panorama-social", "claim": "Brechas de género e informalidad agravan la exclusión: mujeres y trabajadores por cuenta propia son los más excluidos."}
     ]'::jsonb),

    -- 2. Logística y última milla
    ('Costos logísticos altos y última milla deficiente',
     'logistica',
     'Los costos logísticos en LATAM equivalen a ~14-18% del PIB, frente a ~8% en países OECD. La última milla es especialmente costosa por direcciones no estandarizadas, ciudades densas con tráfico crónico y zonas rurales mal conectadas.',
     8,
     '[
       {"source": "BID — Logística y competitividad en LATAM", "url": "https://publications.iadb.org/es/publicacion/logistica-en-america-latina-y-el-caribe", "claim": "Los costos logísticos representan 14-18% del PIB en LATAM, contra ~8% en países OECD."},
       {"source": "Banco Mundial — Logistics Performance Index 2023", "url": "https://lpi.worldbank.org", "claim": "Países LATAM están en general en el segundo y tercer cuartil del LPI; la dimensión más débil es entrega oportuna."},
       {"source": "Statista — E-commerce LATAM", "url": "https://www.statista.com/topics/8584/e-commerce-in-latin-america/", "claim": "Crecimiento del e-commerce >25% anual presiona la última milla mientras la infraestructura no escala al mismo ritmo."}
     ]'::jsonb),

    -- 3. Brecha digital educativa
    ('Brecha digital y desigualdad educativa',
     'edtech',
     'Aproximadamente la mitad de los hogares con escolares en LATAM carecía de acceso a internet en casa al inicio de la pandemia. La brecha persiste especialmente en sectores rurales y vulnerables, generando rezago en habilidades digitales y empleabilidad futura.',
     8,
     '[
       {"source": "UNICEF / CEPAL — Educación en pandemia", "url": "https://www.cepal.org/es/publicaciones/45904-la-educacion-tiempos-la-pandemia-covid-19", "claim": "46% de los niños y adolescentes de 5 a 12 años en LATAM viven en hogares sin conexión a internet."},
       {"source": "BID — Tecnología y aprendizaje", "url": "https://publications.iadb.org/es/publicacion/tecnologia-aprendizaje-y-empleabilidad-america-latina", "claim": "La adopción de plataformas educativas digitales es 2-3 veces menor que en OECD."},
       {"source": "Holon IQ — LATAM EdTech 2023", "url": "https://www.holoniq.com/notes/latam-edtech-100", "claim": "Solo ~30% de instituciones públicas tienen sistemas digitales integrales de aprendizaje."}
     ]'::jsonb),

    -- 4. Acceso a salud
    ('Acceso desigual a atención médica especializada',
     'healthtech',
     'La distribución de médicos y especialistas se concentra en grandes ciudades; provincias y zonas rurales sufren de listas de espera prolongadas, sub-diagnóstico y costos altos para consultar fuera de la región. Telemedicina y diagnóstico remoto siguen siendo subutilizados.',
     8,
     '[
       {"source": "OMS — Disponibilidad de personal sanitario", "url": "https://www.who.int/data/gho/data/themes/topics/health-workforce", "claim": "Densidad de médicos en zonas rurales LATAM puede ser 3-5 veces inferior a la de capitales."},
       {"source": "BID — Salud digital en LATAM", "url": "https://publications.iadb.org/es/transformacion-digital-en-salud", "claim": "Adopción de telemedicina creció con COVID pero persiste regulación fragmentada e infraestructura desigual."},
       {"source": "PAHO — Salud Mental", "url": "https://www.paho.org/es/temas/salud-mental", "claim": "Brecha de tratamiento de salud mental supera el 70% en muchos países de la región."}
     ]'::jsonb),

    -- 5. Productividad agrícola
    ('Baja productividad y pérdida poscosecha en agricultura familiar',
     'agtech',
     'La agricultura familiar produce gran parte de los alimentos consumidos en la región pero opera con baja tecnificación, acceso limitado a crédito y pérdida significativa de cosecha por logística y almacenamiento. Trazabilidad y conexión directa con compradores son problemas crónicos.',
     7,
     '[
       {"source": "FAO — Agricultura Familiar LATAM", "url": "https://www.fao.org/family-farming/regions/latin-america/en/", "claim": "La agricultura familiar representa más del 80% de las explotaciones agrícolas y ~30-40% de la producción regional."},
       {"source": "IICA — Innovación agrícola", "url": "https://www.iica.int/es", "claim": "Las pérdidas poscosecha en LATAM oscilan entre 15-30% según el cultivo y la cadena."},
       {"source": "Banco Mundial — Agricultura LATAM", "url": "https://www.worldbank.org/en/topic/agriculture/overview", "claim": "Adopción de tecnologías digitales en agro LATAM va a la zaga de Asia y EE.UU. por brechas de conectividad rural."}
     ]'::jsonb),

    -- 6. GovTech / trámites
    ('Trámites gubernamentales analógicos y burocráticos',
     'govtech',
     'Una porción importante de los trámites públicos en LATAM aún requiere presencia física, papelería y desplazamientos. Esto genera "costos de cumplimiento" altos para ciudadanos y PyMEs y abre espacio para corrupción de bajo nivel.',
     7,
     '[
       {"source": "BID — GovTech en LATAM", "url": "https://publications.iadb.org/es/govtech-y-el-futuro-del-gobierno", "claim": "Solo ~30% de los trámites gubernamentales LATAM están totalmente en línea con experiencia transaccional completa."},
       {"source": "OECD — Government at a Glance LATAM", "url": "https://www.oecd.org/gov/government-at-a-glance-22214399.htm", "claim": "La satisfacción con servicios públicos digitales en LATAM es ~25 puntos menor que el promedio OECD."},
       {"source": "CAF — Digitalización del Estado", "url": "https://www.caf.com/es/conocimiento/visiones/2022/04/transformacion-digital-del-estado", "claim": "La fragmentación entre ministerios y municipios bloquea ventanillas únicas reales."}
     ]'::jsonb),

    -- 7. Vivienda y proptech
    ('Vivienda informal y financiamiento de mejoras',
     'proptech',
     'Una fracción significativa de los hogares LATAM vive en asentamientos informales o con déficit cualitativo (techo, paredes, sanitarios). El financiamiento para mejoras progresivas es escaso y lo que existe está desconectado de los oficios y materiales locales.',
     7,
     '[
       {"source": "BID / Habitat for Humanity — Déficit habitacional LATAM", "url": "https://publications.iadb.org/es/un-espacio-para-el-desarrollo-mercados-vivienda-en-america-latina-y-el-caribe", "claim": "1 de cada 3 familias en LATAM vive en condiciones inadecuadas; el déficit cualitativo supera al cuantitativo."},
       {"source": "ONU-Hábitat", "url": "https://onuhabitat.org.mx", "claim": "21% de la población urbana LATAM vive en asentamientos informales según datos recientes."}
     ]'::jsonb),

    -- 8. Energía
    ('Acceso eléctrico inestable y costos energéticos para PyMEs y zonas rurales',
     'cleantech',
     'Aunque la cobertura eléctrica regional es alta (>97%), persisten cortes frecuentes, calidad pobre del suministro y costos elevados para pequeños negocios. Energías distribuidas (solar autoconsumo) y eficiencia energética siguen subadoptadas por barreras financieras.',
     6,
     '[
       {"source": "BID Energía", "url": "https://www.iadb.org/es/sectores/energia", "claim": "Aún hay ~17 millones de personas sin acceso eléctrico estable en LATAM y el Caribe."},
       {"source": "IEA — World Energy Outlook LATAM", "url": "https://www.iea.org/regions/latin-america", "claim": "Costo y financiamiento son la principal barrera para escalar solar distribuido en la región."}
     ]'::jsonb),

    -- 9. Microempresarios
    ('PyMEs sin presencia digital ni herramientas de gestión',
     'saas-pyme',
     'MiPyMEs son ~99% de las empresas LATAM y emplean a la mayoría de la fuerza laboral, pero menos de un tercio tiene presencia digital seria. Operan con cuadernos, planillas o WhatsApp sin un sistema de gestión que les permita escalar, conseguir crédito o vender online.',
     8,
     '[
       {"source": "CEPAL — MiPyMEs en LATAM", "url": "https://www.cepal.org/es/publicaciones/45734-mipymes-america-latina-fragil-desempeno-nuevos-desafios-la-politicas-fomento", "claim": "MiPyMEs son ~99% del tejido empresarial y aportan ~25% del PIB regional, con baja productividad relativa."},
       {"source": "OECD — Digital for SMEs LATAM", "url": "https://www.oecd.org/digital/sme/", "claim": "Menos del 30% de las MiPyMEs latinoamericanas usan herramientas digitales avanzadas (CRM, ERP, e-commerce)."},
       {"source": "Statista — Digital adoption SMB LATAM", "url": "https://www.statista.com/topics/4317/small-and-medium-sized-enterprises-smes-in-latin-america/", "claim": "Brecha de adopción digital entre PyMEs y grandes empresas supera 3x en software de gestión."}
     ]'::jsonb),

    -- 10. Talento técnico
    ('Escasez crónica de talento técnico y formación práctica',
     'edtech-talent',
     'La demanda de desarrolladores, diseñadores y profesionales de datos crece a doble dígito mientras la oferta formada no alcanza, particularmente en stacks modernos. Los bootcamps y la educación en español/portugués son insuficientes para cerrar la brecha.',
     7,
     '[
       {"source": "Holon IQ / IDC — Tech Talent LATAM", "url": "https://www.holoniq.com", "claim": "La demanda de desarrolladores en LATAM duplica la oferta formada anualmente."},
       {"source": "BID — Habilidades para el futuro", "url": "https://publications.iadb.org/es/el-futuro-del-trabajo-en-america-latina-y-el-caribe", "claim": "Hasta 30-40% de los empleos requieren reconversión digital; la formación práctica accesible es escasa."},
       {"source": "Statista — Developer demand LATAM", "url": "https://www.statista.com", "claim": "México, Brasil, Argentina y Colombia lideran déficit absoluto de devs en la región."}
     ]'::jsonb);

  END IF;
END $$;
