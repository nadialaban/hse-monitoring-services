create table message_log
(
	id bigserial
		constraint message_log_pk
			primary key,
	type varchar(255),
	params json,
	sender_id varchar(128),
	direction varchar(128) default 'incoming',
	sent_timestamp float8,
	received_timestamp float8,
	connection_id varchar(128),
	client_role varchar(128),
	client_state varchar(128),
	room_id integer
);

create table rooms
(
	id serial
		constraint rooms_pk
			primary key,
	doctor_key varchar(128),
	patient_key varchar(128),
	mode varchar(128),
	recording_enabled bool default true,
	state varchar(128),
	last_activity float8,
	is_uploaded_to_s3 bool default false,
	had_connection bool default false
);



