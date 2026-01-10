import { NextRequest, NextResponse } from 'next/server'

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ success: false, message: 'Endereço não informado' }, { status: 400 })
    }

    if (!GEOAPIFY_API_KEY) {
      console.error('NEXT_PUBLIC_GEOAPIFY_API_KEY não configurada')
      return NextResponse.json({ 
        success: false, 
        message: 'API de geocodificação não configurada. Configure a variável NEXT_PUBLIC_GEOAPIFY_API_KEY no ambiente.' 
      }, { status: 500 })
    }

    const encodedAddress = encodeURIComponent(address)
    // Removido filtro de país para permitir geocodificação em qualquer lugar do mundo
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&apiKey=${GEOAPIFY_API_KEY}&lang=pt`
    
    let response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
    } catch (fetchError: any) {
      console.error('Erro ao fazer requisição para Geoapify:', fetchError)
      return NextResponse.json({ 
        success: false, 
        message: 'Não foi possível conectar à API de geocodificação. Verifique sua conexão com a internet.' 
      }, { status: 500 })
    }
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Geoapify API error (${response.status}):`, errorText)
      
      let errorMessage = 'Erro na API de geocodificação'
      if (response.status === 401) {
        errorMessage = 'Chave de API inválida. Verifique a configuração de GEOAPIFY_API_KEY.'
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado à API de geocodificação. Verifique as permissões da chave de API.'
      } else if (response.status === 429) {
        errorMessage = 'Limite de requisições excedido. Tente novamente mais tarde.'
      } else if (response.status >= 500) {
        errorMessage = 'Serviço de geocodificação temporariamente indisponível. Tente novamente em alguns instantes.'
      }
      
      return NextResponse.json({ 
        success: false, 
        message: errorMessage 
      }, { status: response.status })
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Endereço não encontrado. Tente ser mais específico (inclua cidade e estado).' 
      }, { status: 404 })
    }

    const feature = data.features[0]
    const props = feature.properties

    // Validar que temos coordenadas válidas
    if (!feature.geometry || !feature.geometry.coordinates || feature.geometry.coordinates.length < 2) {
      return NextResponse.json({ 
        success: false, 
        message: 'Coordenadas inválidas retornadas pela API.' 
      }, { status: 500 })
    }

    const latitude = feature.geometry.coordinates[1]
    const longitude = feature.geometry.coordinates[0]

    // Validar que as coordenadas são números válidos
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return NextResponse.json({ 
        success: false, 
        message: 'Coordenadas inválidas retornadas pela API.' 
      }, { status: 500 })
    }

    // Obter confiança do resultado
    const confidence = props.rank?.confidence || 0

    // Validar confiança mínima (30% = 0.3)
    // Resultados com confiança muito baixa podem estar incorretos
    if (confidence < 0.3) {
      return NextResponse.json({ 
        success: false, 
        message: `Confiança muito baixa (${Math.round(confidence * 100)}%). O endereço pode estar incorreto. Tente ser mais específico (inclua número, rua, cidade, estado e país).` 
      }, { status: 400 })
    }

    const result = {
      latitude,
      longitude,
      confidence,
      place_type: props.result_type || 'unknown',
      formatted_address: props.formatted || address,
      city: props.city || props.county || null,
      state: props.state || null,
      country: props.country || null,
    }

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro inesperado na geocodificação. Tente novamente.' 
    }, { status: 500 })
  }
}
