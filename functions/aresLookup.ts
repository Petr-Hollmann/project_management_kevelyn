import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ICO from request body
    const { ico } = await req.json();
    
    if (!ico) {
      return Response.json({ error: 'IČO is required' }, { status: 400 });
    }

    // Validate ICO format (basic check - should be 8 digits)
    const icoClean = ico.toString().replace(/\s/g, '');
    if (!/^\d{8}$/.test(icoClean)) {
      return Response.json({ 
        error: 'Neplatný formát IČO. IČO musí obsahovat 8 číslic.' 
      }, { status: 400 });
    }

    // Call ARES API
    const aresUrl = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-rzp/${icoClean}`;
    const aresResponse = await fetch(aresUrl);

    if (!aresResponse.ok) {
      if (aresResponse.status === 404) {
        return Response.json({ 
          error: 'Subjekt s tímto IČO nebyl nalezen v registru ARES.' 
        }, { status: 404 });
      }
      return Response.json({ 
        error: 'Nepodařilo se načíst data z ARES.' 
      }, { status: 500 });
    }

    const aresData = await aresResponse.json();

    // Extract relevant data from ARES response
    const zaznam = aresData.zaznamy?.[0];
    if (!zaznam) {
      return Response.json({ 
        error: 'Data subjektu nebyla nalezena.' 
      }, { status: 404 });
    }

    // Build response data
    const responseData = {};

    // Basic data
    responseData.ico = zaznam.ico || icoClean;
    responseData.obchodniJmeno = zaznam.obchodniJmeno;
    responseData.dic = zaznam.dic;

    // Address data - from adresySubjektu array (first address)
    const adresa = zaznam.adresySubjektu?.[0];
    if (adresa) {
      responseData.ulice = adresa.nazevUlice || '';
      responseData.cisloDomovni = adresa.cisloDomovni || '';
      responseData.cisloOrientacni = adresa.cisloOrientacni || '';
      responseData.cisloOrientacniPismeno = adresa.cisloOrientacniPismeno || '';
      responseData.mesto = adresa.nazevObce || '';
      responseData.psc = adresa.psc ? adresa.psc.toString().padStart(5, '0') : '';
      responseData.kraj = adresa.nazevKraje || '';
      responseData.stat = adresa.nazevStatu || 'Česká republika';
      
      // Build complete address string
      let adresaStr = '';
      if (adresa.nazevUlice) {
        adresaStr = adresa.nazevUlice;
        if (adresa.cisloDomovni) {
          adresaStr += ` ${adresa.cisloDomovni}`;
          if (adresa.cisloOrientacni) {
            adresaStr += `/${adresa.cisloOrientacni}`;
            if (adresa.cisloOrientacniPismeno) {
              adresaStr += adresa.cisloOrientacniPismeno;
            }
          }
        }
      } else if (adresa.cisloDomovni) {
        adresaStr = `č.p. ${adresa.cisloDomovni}`;
      }
      responseData.adresa = adresaStr;
    }

    // For individuals (OSVČ) - from osobaPodnikatel
    const osoba = zaznam.osobaPodnikatel;
    if (osoba) {
      responseData.jmeno = osoba.jmeno;
      responseData.prijmeni = osoba.prijmeni;
      responseData.titulPredJmenem = osoba.titulPredJmenem;
      responseData.titulZaJmenem = osoba.titulZaJmenem;
      responseData.datumNarozeni = osoba.datumNarozeni;
      responseData.statniObcanstvi = osoba.statniObcanstvi;
    }

    return Response.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('ARES lookup error:', error);
    return Response.json({ 
      error: 'Došlo k chybě při zpracování požadavku.' 
    }, { status: 500 });
  }
});