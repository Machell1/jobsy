"""
Jobsy Database Seed Script
Tasks 1 & 2: Clean test data, insert realistic seed data
"""
import psycopg2
import bcrypt
import uuid
from datetime import datetime, timezone

DB_URL = 'postgresql://postgres:TRmnVNmXLMsuAkFNJcxErHnzCENpgTFL@switchback.proxy.rlwy.net:35094/railway'

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()

def now():
    return datetime.now(timezone.utc)

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # ===== TASK 1: Delete test data =====
    print('=== TASK 1: Deleting test data ===')

    # Delete payments referencing test bookings first
    cur.execute("""DELETE FROM payments WHERE "bookingId" IN (
        SELECT id FROM bookings WHERE "serviceId" IN (
            SELECT id FROM services WHERE title ILIKE '%audit%' OR title ILIKE '%test%' OR title ILIKE '%QA%' OR title ILIKE '%E2E%'
        )
    )""")
    print(f'Deleted {cur.rowcount} test payments')

    # Delete bookings referencing test services first
    cur.execute("""DELETE FROM bookings WHERE "serviceId" IN (
        SELECT id FROM services WHERE title ILIKE '%audit%' OR title ILIKE '%test%' OR title ILIKE '%QA%' OR title ILIKE '%E2E%'
    )""")
    print(f'Deleted {cur.rowcount} test bookings')

    # Delete reviews referencing test services
    cur.execute("""DELETE FROM reviews WHERE "serviceId" IN (
        SELECT id FROM services WHERE title ILIKE '%audit%' OR title ILIKE '%test%' OR title ILIKE '%QA%' OR title ILIKE '%E2E%'
    )""")
    print(f'Deleted {cur.rowcount} test reviews on test services')

    cur.execute("""DELETE FROM services
        WHERE title ILIKE '%audit%' OR title ILIKE '%test%' OR title ILIKE '%QA%' OR title ILIKE '%E2E%'""")
    print(f'Deleted {cur.rowcount} test services')

    # Delete bookings by test users
    cur.execute("""DELETE FROM bookings WHERE "customerId" IN (
        SELECT id FROM users WHERE (email ILIKE '%test%' OR email ILIKE '%audit%' OR email ILIKE '%qa%' OR email ILIKE '%e2e%' OR email ILIKE '%prod-test%' OR email ILIKE '%domain-test%')
        AND email != 'admin@jobsyja.com'
    ) OR "providerId" IN (
        SELECT id FROM users WHERE (email ILIKE '%test%' OR email ILIKE '%audit%' OR email ILIKE '%qa%' OR email ILIKE '%e2e%' OR email ILIKE '%prod-test%' OR email ILIKE '%domain-test%')
        AND email != 'admin@jobsyja.com'
    )""")
    print(f'Deleted {cur.rowcount} bookings by test users')

    cur.execute("""DELETE FROM users
        WHERE (email ILIKE '%test%' OR email ILIKE '%audit%' OR email ILIKE '%qa%' OR email ILIKE '%e2e%' OR email ILIKE '%prod-test%' OR email ILIKE '%domain-test%')
        AND email != 'admin@jobsyja.com'""")
    print(f'Deleted {cur.rowcount} test users')

    conn.commit()
    print('Task 1 complete\n')

    # ===== TASK 2: Realistic seed data =====
    print('=== TASK 2: Inserting realistic seed data ===')

    # Fetch category IDs
    cur.execute("SELECT slug, id FROM categories")
    cats = {row[0]: row[1] for row in cur.fetchall()}
    print('Categories found:', list(cats.keys()))

    # Check if seed users already exist, skip if so
    cur.execute("SELECT email FROM users WHERE email IN ('kemar.brown@jobsyja.com', 'shanelle.thompson@jobsyja.com', 'devon.mitchell@jobsyja.com')")
    existing = [r[0] for r in cur.fetchall()]
    if existing:
        print(f'Seed users already exist: {existing}. Skipping user inserts.')

    # Provider 1: Kemar Brown
    kemar_id = str(uuid.uuid4())
    if 'kemar.brown@jobsyja.com' not in existing:
        cur.execute("""
            INSERT INTO users (id, email, "passwordHash", name, role, "isEmailVerified", "isActive", "verificationStatus", parish, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, 'PROVIDER'::"UserRole", true, true, 'APPROVED'::"VerificationStatus", %s, %s, %s)
        """, (kemar_id, 'kemar.brown@jobsyja.com', hash_password('Provider123!'), 'Kemar Brown', 'Manchester', now(), now()))
        print(f'Created user: Kemar Brown ({kemar_id})')
    else:
        cur.execute("SELECT id FROM users WHERE email='kemar.brown@jobsyja.com'")
        kemar_id = cur.fetchone()[0]
        print(f'Using existing Kemar Brown ({kemar_id})')

    # Provider 2: Shanelle Thompson
    shanelle_id = str(uuid.uuid4())
    if 'shanelle.thompson@jobsyja.com' not in existing:
        cur.execute("""
            INSERT INTO users (id, email, "passwordHash", name, role, "isEmailVerified", "isActive", "verificationStatus", parish, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, 'PROVIDER'::"UserRole", true, true, 'APPROVED'::"VerificationStatus", %s, %s, %s)
        """, (shanelle_id, 'shanelle.thompson@jobsyja.com', hash_password('Provider123!'), 'Shanelle Thompson', 'Kingston', now(), now()))
        print(f'Created user: Shanelle Thompson ({shanelle_id})')
    else:
        cur.execute("SELECT id FROM users WHERE email='shanelle.thompson@jobsyja.com'")
        shanelle_id = cur.fetchone()[0]
        print(f'Using existing Shanelle Thompson ({shanelle_id})')

    # Provider 3: Devon Mitchell
    devon_id = str(uuid.uuid4())
    if 'devon.mitchell@jobsyja.com' not in existing:
        cur.execute("""
            INSERT INTO users (id, email, "passwordHash", name, role, "isEmailVerified", "isActive", "verificationStatus", parish, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, 'PROVIDER'::"UserRole", true, true, 'APPROVED'::"VerificationStatus", %s, %s, %s)
        """, (devon_id, 'devon.mitchell@jobsyja.com', hash_password('Provider123!'), 'Devon Mitchell', 'St. James', now(), now()))
        print(f'Created user: Devon Mitchell ({devon_id})')
    else:
        cur.execute("SELECT id FROM users WHERE email='devon.mitchell@jobsyja.com'")
        devon_id = cur.fetchone()[0]
        print(f'Using existing Devon Mitchell ({devon_id})')

    conn.commit()

    # Insert 7 service listings
    services = [
        {
            'id': str(uuid.uuid4()),
            'title': 'Expert Plumbing Services',
            'description': (
                'Reliable, professional plumbing services throughout Manchester and surrounding parishes. '
                'Over 12 years of experience handling everything from burst pipes and drain blockages to full '
                'bathroom installations and water heater replacements. All work is done to the highest standard '
                'using quality materials. Available for emergency callouts 7 days a week. Free estimates provided. '
                'References available on request. Whether you need a dripping tap fixed or a complete '
                'plumbing overhaul, I have you covered.'
            ),
            'providerId': kemar_id,
            'categoryId': cats.get('plumbing'),
            'priceMin': 3000,
            'priceMax': 15000,
            'parish': 'Manchester',
            'tags': ['plumbing', 'emergency', 'installation', 'repair'],
            'isFeatured': True,
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Residential Electrical Work',
            'description': (
                'Licensed electrician offering comprehensive residential electrical services in Manchester. '
                'Services include new wiring installations, panel upgrades, circuit breaker replacement, '
                'outdoor lighting, ceiling fan installation, and electrical safety inspections. '
                'All work complies with Jamaican electrical standards and building codes. '
                'I prioritise safety above all else and provide a full warranty on all labour. '
                'Same-day service available for urgent electrical faults. Call for a free assessment.'
            ),
            'providerId': kemar_id,
            'categoryId': cats.get('electrical'),
            'priceMin': 5000,
            'priceMax': 25000,
            'parish': 'Manchester',
            'tags': ['electrical', 'wiring', 'installation', 'licensed'],
            'isFeatured': True,
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Deep Home Cleaning',
            'description': (
                'Transform your home with our thorough deep cleaning service in Kingston. '
                'We tackle every corner — from grease-caked kitchen appliances to bathroom tiles, '
                'skirting boards, window sills, and behind furniture. Our team uses eco-friendly, '
                'hospital-grade cleaning products that are safe for children and pets. '
                'Flexible scheduling including weekends and evenings. We bring all equipment and '
                'supplies. One-time deep cleans and recurring weekly/bi-weekly packages available. '
                'Satisfaction guaranteed — we re-clean any area you\'re not happy with at no extra cost.'
            ),
            'providerId': shanelle_id,
            'categoryId': cats.get('home-cleaning'),
            'priceMin': 4000,
            'priceMax': 10000,
            'parish': 'Kingston',
            'tags': ['cleaning', 'deep clean', 'home', 'eco-friendly'],
            'isFeatured': True,
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Braiding & Natural Hair Care',
            'description': (
                'Professional natural hair braiding and styling services in Kingston. '
                'Specialising in box braids, cornrows, knotless braids, twists, locs maintenance, '
                'and protective styling. Using only high-quality, tangle-free braiding hair. '
                'I have been working with natural hair for over 8 years and take pride in clean, '
                'precise parts and long-lasting styles. Home visits available in Kingston and '
                'St. Andrew for an additional travel fee. Appointments recommended but walk-ins welcome.'
            ),
            'providerId': shanelle_id,
            'categoryId': cats.get('beauty-hair'),
            'priceMin': 2500,
            'priceMax': 8000,
            'parish': 'Kingston',
            'tags': ['braiding', 'natural hair', 'box braids', 'cornrows', 'locs'],
            'isFeatured': True,
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Event Makeup Services',
            'description': (
                'Professional makeup artistry for weddings, graduations, parties, and special events '
                'across Kingston and St. Andrew. Certified makeup artist with training from the '
                'International Beauty Institute. Specialising in full glam, bridal, natural glow, '
                'and editorial looks. Using only premium, long-lasting products including MAC, '
                'Charlotte Tilbury, and Fenty Beauty. Airbrush makeup available for weddings. '
                'Bridal packages include trial session, day-of application, and touch-up kit. '
                'Group bookings for bridesmaids and mothers-of-the-bride also available.'
            ),
            'providerId': shanelle_id,
            'categoryId': cats.get('beauty-hair'),
            'priceMin': 5000,
            'priceMax': 15000,
            'parish': 'St. Andrew',
            'tags': ['makeup', 'bridal', 'events', 'glam', 'professional'],
            'isFeatured': False,
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Lawn Care & Garden Maintenance',
            'description': (
                'Keep your property looking its best with professional lawn care and garden maintenance '
                'in St. James. Services include lawn mowing, edging, weed control, hedge trimming, '
                'tree pruning, garden bed maintenance, and landscaping design. '
                'I operate a reliable schedule — you can count on me to show up consistently '
                'every week or fortnight. Monthly contracts available at discounted rates. '
                'Also offering one-time clean-ups for properties that have been neglected. '
                'Equipment is commercial grade and well-maintained. Serving Montego Bay, '
                'Ironshore, Rose Hall, and surrounding communities.'
            ),
            'providerId': devon_id,
            'categoryId': cats.get('landscaping'),
            'priceMin': 3500,
            'priceMax': 12000,
            'parish': 'St. James',
            'tags': ['lawn care', 'garden', 'landscaping', 'maintenance', 'mowing'],
            'isFeatured': True,
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Home Renovation & Construction',
            'description': (
                'Full-service home renovation and construction company based in St. James. '
                'We handle everything from kitchen remodels and bathroom renovations to extensions, '
                'retaining walls, tiling, roofing repairs, and new construction. '
                'Over 15 years of experience delivering quality construction projects across '
                'western Jamaica. Our team of skilled tradesmen includes masons, carpenters, '
                'tilers, and painters. We provide detailed written quotes, project timelines, '
                'and progress updates throughout. Licensed, insured, and fully compliant with '
                'National Construction Act requirements. Financing options available for large projects.'
            ),
            'providerId': devon_id,
            'categoryId': cats.get('construction'),
            'priceMin': 50000,
            'priceMax': 500000,
            'parish': 'St. James',
            'tags': ['construction', 'renovation', 'building', 'tiling', 'roofing'],
            'isFeatured': False,
        },
    ]

    inserted = 0
    for svc in services:
        if svc['categoryId'] is None:
            print(f"WARNING: No categoryId found for service: {svc['title']}")
            continue
        cur.execute("""
            INSERT INTO services (id, title, description, "providerId", "categoryId", "priceMin", "priceMax",
                "priceCurrency", "priceUnit", parish, tags, "isFeatured", "isActive", "viewCount", "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'JMD', 'job', %s, %s, %s, true, 0, %s, %s)
        """, (
            svc['id'], svc['title'], svc['description'], svc['providerId'], svc['categoryId'],
            svc['priceMin'], svc['priceMax'], svc['parish'],
            svc['tags'], svc['isFeatured'], now(), now()
        ))
        inserted += 1
        print(f"Inserted service: {svc['title']} ({svc['parish']}) featured={svc['isFeatured']}")

    conn.commit()
    print(f'\nTask 2 complete: {inserted} services inserted')

    # Final summary
    cur.execute("SELECT COUNT(*) FROM users WHERE email NOT LIKE '%admin%'")
    print(f'\nTotal non-admin users: {cur.fetchone()[0]}')
    cur.execute("SELECT COUNT(*) FROM services WHERE \"isActive\"=true AND \"deletedAt\" IS NULL")
    print(f'Total active services: {cur.fetchone()[0]}')
    cur.execute("SELECT COUNT(*) FROM services WHERE \"isFeatured\"=true AND \"isActive\"=true AND \"deletedAt\" IS NULL")
    print(f'Featured services: {cur.fetchone()[0]}')

    conn.close()

if __name__ == '__main__':
    main()
