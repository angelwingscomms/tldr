create table u (
  id text primary key,
  e text unique,
  p text,
  g text unique,
  n text,
  pic text,
  dv integer not null default 1,
  bal integer not null default 0,
  lg integer not null default 0,
  cr integer not null
);
create table pv (
  id text primary key,
  uid text not null,
  n text not null,
  b text not null,
  k text not null,
  m text,
  cr integer not null
);
create index pv_uid on pv (uid);
create table s (
  rid integer primary key autoincrement,
  id text unique not null,
  uid text not null,
  h text,
  t text not null,
  src text,
  ty text not null,
  md text not null,
  ln text not null,
  b text not null,
  tr text,
  pub integer not null default 0,
  cr integer not null
);
create index s_uid_cr on s (uid, cr desc);
create index s_h on s (h);
create table ce (
  id text primary key,
  uid text not null,
  k text not null,
  amt integer not null,
  bal integer not null,
  ref text unique,
  cr integer not null
);
create index ce_uid on ce (uid, cr desc);
create virtual table s_fts using fts5(t, b, content='s', content_rowid='rid');
create trigger s_ai after insert on s begin
  insert into s_fts(rowid, t, b) values (new.rid, new.t, new.b);
end;
create trigger s_ad after delete on s begin
  insert into s_fts(s_fts, rowid, t, b) values ('delete', old.rid, old.t, old.b);
end;
create trigger s_au after update on s begin
  insert into s_fts(s_fts, rowid, t, b) values ('delete', old.rid, old.t, old.b);
  insert into s_fts(rowid, t, b) values (new.rid, new.t, new.b);
end;
