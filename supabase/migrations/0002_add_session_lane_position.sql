-- Capture the JKT48 API's own session_detail[] array order as a stored
-- ordinal, so lane cards can be rendered in the order JKT48 intends instead
-- of arbitrary DB order.

alter table session_lanes add column position integer not null default 0;

create index idx_session_lanes_session_position on session_lanes (session_id, position);
