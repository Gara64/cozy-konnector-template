'use strict'

const {BaseKonnector, saveFiles, request} = require('cozy-konnector-libs')

const rq = request({
    json: true,
    jar: true
  }
)
let idToken = ''

module.exports = new BaseKonnector(requiredFields => {

  // Authenticate
  return rq({
    uri: 'https://auth.payfit.com/signin',
    method: 'POST',
    body: {
      email: requiredFields.email,
      password: requiredFields.password,
      username: requiredFields.username,
      language: 'fr'
    }
  })
  // Get Cookie
  .then(body => {
    let id = body.accounts[0].id
    let tokens = id.split('/')
    let companyId = tokens[0]
    let employeeId = tokens[1]
    idToken = body.idToken

    return rq({
      uri: 'https://auth.payfit.com/updateCurrentCompany?application=hr-apps/user&companyId=' +
        companyId +
        '&customApp=false&employeeId=' +
        employeeId +
        '&holdingId&idToken=' +
        idToken +
        '&origin=https://app.payfit.com'
    })
  })
  // Get list of payrolls
  .then(body => {
    let res = rq({
      method: 'POST',
      uri: 'https://api.payfit.com/api/employees/payrolls',
      headers: {
        'Authorization': idToken
      },
    })
    return res
  })
  // Retrieve payrolls
  .then(body => {
    console.log('body : ' + JSON.stringify(body))
    let baseUrl = 'https://api.payfit.com/api'

    let files = body.map(function(payroll) {
      let url = baseUrl + payroll.url + '?' + idToken
      // TODO: the fileName is the absoluteMonth, computed from the employee's
      // contract signing month. Some scrapping is needed to get a more
      // human-readable filename
      return {
        fileurl: url,
        filename: payroll.absoluteMonth.toString() + '.pdf',
        requestOptions: {
          headers: {
            'Authorization': idToken
          }
        }
      }
    })
    return files
  })
  .then(entries => saveFiles(entries, requiredFields.folderPath))
  .catch(err => {
    // Connector is not in error if there is not entry in the end
    // It may be simply an empty account
    if (err.message === 'NO_ENTRY') return []
    throw err
  })
});
