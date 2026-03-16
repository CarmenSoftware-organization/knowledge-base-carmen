-- 0007_create_faq.sql
-- Migration: FAQ schema (BU-aware) for hierarchical FAQ modules
-- รัน: go run cmd/server/main.go migrate migrations/0007_create_faq.sql
--
-- โครงสร้าง:
-- public.business_units (มีอยู่แล้ว)
--   ↳ faq_modules        (module หลักของแต่ละ BU)
--        ↳ faq_submodules
--             ↳ faq_categories
--                  ↳ faq_entries
--                      ↳ faq_related (optional self reference)

-- 1) FAQ Modules (ระดับบนสุดในหน้า FAQ)
CREATE TABLE IF NOT EXISTS public.faq_modules (
    id          SERIAL PRIMARY KEY,
    bu_id       INT NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,              -- ชื่อแสดงผล เช่น 'Account Payable'
    slug        TEXT NOT NULL,              -- ใช้ใน URL เช่น 'ap'
    icon        TEXT,                       -- optional, เก็บชื่อ icon
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bu_id, slug)
);

-- 2) Submodules (เช่น ภายใน AP แยกเป็น Invoice / Payment / WHT)
CREATE TABLE IF NOT EXISTS public.faq_submodules (
    id          SERIAL PRIMARY KEY,
    module_id   INT NOT NULL REFERENCES public.faq_modules(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (module_id, slug)
);

-- 3) Categories ภายในแต่ละ Submodule
CREATE TABLE IF NOT EXISTS public.faq_categories (
    id            SERIAL PRIMARY KEY,
    submodule_id  INT NOT NULL REFERENCES public.faq_submodules(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL,
    sort_order    INT DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (submodule_id, slug)
);

-- 4) FAQ Entries (ตัวคำถาม/คำตอบจริง)
CREATE TABLE IF NOT EXISTS public.faq_entries (
    id             BIGSERIAL PRIMARY KEY,
    category_id    INT NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,

    title          TEXT NOT NULL,   -- หัวข้อคำถาม
    sample_case    TEXT,            -- ตัวอย่างเคสจริง
    problem_cause  TEXT,            -- สาเหตุของปัญหา
    solution       TEXT,            -- วิธีแก้ + วิธีป้องกัน
    tags           TEXT[] DEFAULT '{}', -- เช่น {Procurement,Receiving}

    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by     TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 5) ความสัมพันธ์ FAQ ที่เกี่ยวข้องกัน (optional, self reference)
CREATE TABLE IF NOT EXISTS public.faq_related (
    faq_id         BIGINT NOT NULL REFERENCES public.faq_entries(id) ON DELETE CASCADE,
    related_faq_id BIGINT NOT NULL REFERENCES public.faq_entries(id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, related_faq_id)
);

