--
-- PostgreSQL database dump
--

\restrict vxSDxdbgmyJ9X5K4xzzNIP4cvagXEi2hcdcZzdmMgjRfYhNbrMyxq4KWKmdIDDy

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: immologik
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO immologik;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: immologik
--

COMMENT ON SCHEMA public IS '';


--
-- Name: InternalRole; Type: TYPE; Schema: public; Owner: immologik
--

CREATE TYPE public."InternalRole" AS ENUM (
    'ADMIN',
    'EMPLOYEE'
);


ALTER TYPE public."InternalRole" OWNER TO immologik;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO immologik;

--
-- Name: User; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "displayName" text NOT NULL,
    role public."InternalRole" DEFAULT 'EMPLOYEE'::public."InternalRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO immologik;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public.documents (
    id text NOT NULL,
    title text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "storageKey" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    category text DEFAULT 'Sonstiges'::text NOT NULL,
    "objectId" text,
    "objectName" text,
    status text DEFAULT 'Vorhanden'::text NOT NULL,
    "uploadedBy" text
);


ALTER TABLE public.documents OWNER TO immologik;

--
-- Name: mieter; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public.mieter (
    id text NOT NULL,
    "fullName" text NOT NULL,
    "objectName" text NOT NULL,
    unit text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    status text DEFAULT 'Aktiv'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.mieter OWNER TO immologik;

--
-- Name: objects; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public.objects (
    id text NOT NULL,
    "displayId" text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    occupancy text DEFAULT '0%'::text NOT NULL,
    "monthlyTargetRent" text DEFAULT '0 â‚¬'::text NOT NULL,
    note text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.objects OWNER TO immologik;

--
-- Name: rent_units; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public.rent_units (
    id text NOT NULL,
    "objectId" text NOT NULL,
    "unitLabel" text NOT NULL,
    tenant text NOT NULL,
    "sollMiete" double precision NOT NULL,
    "istMiete" double precision DEFAULT 0 NOT NULL,
    "zahlungsStatus" text DEFAULT 'Offen'::text NOT NULL,
    "faelligAm" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.rent_units OWNER TO immologik;

--
-- Name: vertraege; Type: TABLE; Schema: public; Owner: immologik
--

CREATE TABLE public.vertraege (
    id text NOT NULL,
    title text NOT NULL,
    "objectName" text NOT NULL,
    "tenantName" text NOT NULL,
    "startDate" text NOT NULL,
    "endDate" text NOT NULL,
    status text DEFAULT 'Aktiv'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vertraege OWNER TO immologik;

--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public."Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public."User" (id, email, "displayName", role, "isActive", "tenantId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public.documents (id, title, "fileName", "mimeType", size, "storageKey", "createdAt", "updatedAt", category, "objectId", "objectName", status, "uploadedBy") FROM stdin;
\.


--
-- Data for Name: mieter; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public.mieter (id, "fullName", "objectName", unit, email, phone, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public.objects (id, "displayId", name, address, type, status, units, occupancy, "monthlyTargetRent", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: rent_units; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public.rent_units (id, "objectId", "unitLabel", tenant, "sollMiete", "istMiete", "zahlungsStatus", "faelligAm", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vertraege; Type: TABLE DATA; Schema: public; Owner: immologik
--

COPY public.vertraege (id, title, "objectName", "tenantName", "startDate", "endDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: mieter mieter_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public.mieter
    ADD CONSTRAINT mieter_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: rent_units rent_units_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public.rent_units
    ADD CONSTRAINT rent_units_pkey PRIMARY KEY (id);


--
-- Name: vertraege vertraege_pkey; Type: CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public.vertraege
    ADD CONSTRAINT vertraege_pkey PRIMARY KEY (id);


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: immologik
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: immologik
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_tenantId_idx; Type: INDEX; Schema: public; Owner: immologik
--

CREATE INDEX "User_tenantId_idx" ON public."User" USING btree ("tenantId");


--
-- Name: documents_storageKey_key; Type: INDEX; Schema: public; Owner: immologik
--

CREATE UNIQUE INDEX "documents_storageKey_key" ON public.documents USING btree ("storageKey");


--
-- Name: objects_displayId_key; Type: INDEX; Schema: public; Owner: immologik
--

CREATE UNIQUE INDEX "objects_displayId_key" ON public.objects USING btree ("displayId");


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: immologik
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: immologik
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict vxSDxdbgmyJ9X5K4xzzNIP4cvagXEi2hcdcZzdmMgjRfYhNbrMyxq4KWKmdIDDy

