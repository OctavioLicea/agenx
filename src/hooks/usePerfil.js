// src/hooks/usePerfil.js
// Motivo: se agrega avatar_url al select — ahora regresa un objeto
//   { nombreCorto, avatarUrl } en vez de un string suelto, para que
//   TopBar pueda mostrar la foto real en vez de solo el nombre.
// 2026-07-06, 00:30 hrs

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePerfil(user, version = 0) {
  const [perfil, setPerfil] = useState({ nombreCorto: null, avatarUrl: null });

  useEffect(() => {
    if (!user) {
      setPerfil({ nombreCorto: null, avatarUrl: null });
      return;
    }

    let activo = true;

    supabase
      .from('perfiles')
      .select('nombre_corto, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error al leer perfil:', error.message);
          return;
        }
        setPerfil({
          nombreCorto: data?.nombre_corto ?? null,
          avatarUrl: data?.avatar_url ?? null,
        });
      });

    return () => {
      activo = false;
    };
  }, [user, version]);

  return perfil;
}