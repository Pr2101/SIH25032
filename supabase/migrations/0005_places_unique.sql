-- Add a deterministic unique constraint for PostgREST upserts
-- Required because on_conflict=name,state needs a matching unique/exclusion constraint

alter table public.places
    add constraint ux_places_name_state_exact unique (name, state);


