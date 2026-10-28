require('dotenv').config();
const pool = require('./db');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migration...\n');

    // Start transaction
    await client.query('BEGIN');

    // Create entities table FIRST (referenced by other tables)
    console.log('Creating entities table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        administrator_id VARCHAR(255) NOT NULL,
        entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('artist', 'promoter')),
        name VARCHAR(255) NOT NULL,
        alias VARCHAR(50) UNIQUE,
        bio TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        members JSONB DEFAULT '[]'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (administrator_id)
      );
    `);

    // Create tours table SECOND (shows references it)
    console.log('Creating tours table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create shows table THIRD (references tours)
    console.log('Creating shows table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id VARCHAR(255) NOT NULL,
        tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
        venue_name VARCHAR(255),
        venue_address TEXT,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'USA',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        load_in_time TIME,
        sound_check_time TIME,
        door_time TIME,
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
        notes TEXT,
        fee DECIMAL(10, 2),
        guaranteed_fee DECIMAL(10, 2),
        backend_deal VARCHAR(100),
        is_paid BOOLEAN DEFAULT false,
        capacity INTEGER,
        ticket_price DECIMAL(10, 2),
        promoter_name VARCHAR(255),
        promoter_email VARCHAR(255),
        promoter_phone VARCHAR(50),
        currency VARCHAR(3),
        google_calendar_event_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create invites table
    console.log('Creating invites table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_entity_id VARCHAR(255) NOT NULL,
        to_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
        message TEXT,
        permissions JSONB DEFAULT '{"canView": true, "canEdit": false, "canShare": false}'::jsonb,
        expires_at TIMESTAMP NOT NULL,
        token VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP
      );
    `);

    // Create contacts table
    console.log('Creating contacts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_a_id VARCHAR(255) NOT NULL,
        entity_b_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        message TEXT,
        requested_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        UNIQUE (entity_a_id, entity_b_id)
      );
    `);

    // Create calendar_connections table
    console.log('Creating calendar_connections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        provider VARCHAR(50) DEFAULT 'google',
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMP,
        calendar_id VARCHAR(255),
        calendar_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, provider)
      );
    `);

    // Create notifications table
    console.log('Creating notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        action_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create budgets table
    console.log('Creating budgets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
        entity_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Metadata
        budget_name VARCHAR(255) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        notes TEXT,

        -- Revenue
        ticket_sales DECIMAL(10,2),
        merch_sales_per_person DECIMAL(10,2),
        merch_card_sales DECIMAL(10,2),
        merch_cash_sales DECIMAL(10,2),
        total_sales DECIMAL(10,2),
        previous_sales DECIMAL(10,2),

        -- Logistics
        city VARCHAR(255),
        distance DECIMAL(10,2),

        -- Expenses
        cash_flow DECIMAL(10,2),
        fees_cash DECIMAL(10,2),
        extra_expenses DECIMAL(10,2),
        agent_commission_percent DECIMAL(5,2) DEFAULT 10.00,
        agent_commission DECIMAL(10,2),
        van_costs DECIMAL(10,2),
        driver_fees DECIMAL(10,2),
        van_rental DECIMAL(10,2),
        gas_costs DECIMAL(10,2),
        accommodation_costs DECIMAL(10,2),
        flight_costs DECIMAL(10,2),
        general_payouts DECIMAL(10,2),
        merch_person_fees DECIMAL(10,2),
        merch_cost_of_goods DECIMAL(10,2),

        -- Calculated fields
        fee_balance DECIMAL(10,2),
        fee_surplus DECIMAL(10,2),
        total_expenses DECIMAL(10,2),
        merch_daily_surplus DECIMAL(10,2),
        order_count INTEGER,
        avg_card_order_value DECIMAL(10,2),
        net_profit DECIMAL(10,2),
        variation DECIMAL(10,2)
      );
    `);

    // Create band_member_payouts table
    console.log('Creating band_member_payouts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS band_member_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        member_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        member_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        percentage DECIMAL(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entities_administrator_id ON entities(administrator_id);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

      CREATE INDEX IF NOT EXISTS idx_shows_entity_id ON shows(entity_id);
      CREATE INDEX IF NOT EXISTS idx_shows_tour_id ON shows(tour_id);
      CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
      CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);

      CREATE INDEX IF NOT EXISTS idx_tours_entity_id ON tours(entity_id);
      CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);

      CREATE INDEX IF NOT EXISTS idx_invites_from_entity_id ON invites(from_entity_id);
      CREATE INDEX IF NOT EXISTS idx_invites_to_email ON invites(to_email);
      CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);

      CREATE INDEX IF NOT EXISTS idx_contacts_entity_a ON contacts(entity_a_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_entity_b ON contacts(entity_b_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

      CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_connections(user_id);

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

      CREATE INDEX IF NOT EXISTS idx_budgets_show_id ON budgets(show_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_tour_id ON budgets(tour_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_entity_id ON budgets(entity_id);

      CREATE INDEX IF NOT EXISTS idx_band_member_payouts_budget_id ON band_member_payouts(budget_id);
    `);

    // Create trigger function
    console.log('Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers
    console.log('Creating triggers...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_shows_updated_at ON shows;
      CREATE TRIGGER update_shows_updated_at
        BEFORE UPDATE ON shows
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_tours_updated_at ON tours;
      CREATE TRIGGER update_tours_updated_at
        BEFORE UPDATE ON tours
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
      CREATE TRIGGER update_entities_updated_at
        BEFORE UPDATE ON entities
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_calendar_updated_at ON calendar_connections;
      CREATE TRIGGER update_calendar_updated_at
        BEFORE UPDATE ON calendar_connections
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
      CREATE TRIGGER update_budgets_updated_at
        BEFORE UPDATE ON budgets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('  - entities');
    console.log('  - shows');
    console.log('  - tours');
    console.log('  - invites');
    console.log('  - contacts');
    console.log('  - calendar_connections');
    console.log('  - notifications');
    console.log('  - budgets');
    console.log('  - band_member_payouts');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 Database is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
