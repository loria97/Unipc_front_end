import { Injectable } from '@angular/core';
// Unico file del progetto che importa `@supabase/supabase-js`: nessun altro
// service o componente deve creare un client Supabase o importare questo
// pacchetto direttamente (vedi CLAUDE.md, regola non negoziabile #5).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  // Client creato una sola volta per tutta la vita dell'applicazione.
  // Nessuna configurazione auth: questo livello dati è read-only e sfrutta
  // solo la anon key con RLS lato Postgres.
  private readonly supabaseClient: SupabaseClient<Database> = createClient<Database>(
    environment.supabase.url,
    environment.supabase.anonKey,
  );

  get client(): SupabaseClient<Database> {
    return this.supabaseClient;
  }
}
