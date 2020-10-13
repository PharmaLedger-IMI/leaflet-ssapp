<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="urn:hl7-org:v3"
                xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="urn:hl7-org:v3 https://www.accessdata.fda.gov/spl/schema/spl.xsd">
    <xsl:output method="html"/>
    <xsl:template match="/">
        <html>
            <head>
                <title>Electronic Product Information</title>
            </head>
            <body>
                <psk-accordion>
                    <xsl:for-each select="//xs:component/xs:structuredBody/xs:component">
                        <psk-accordion-item>
                            <xsl:attribute name="title">
                                <xsl:value-of select="xs:section/xs:code/@displayName"/>
                            </xsl:attribute>

                            <!--e.g. SPL LISTING DATA ELEMENTS SECTION-->
                            <!--<xsl:choose>
                                <xsl:when test="xs:section/xs:excerpt/xs:highlight">
                                    <div>
                                        <xsl:copy>
                                            <xsl:apply-templates select="xs:section/xs:excerpt/xs:highlight"/>
                                        </xsl:copy>
                                    </div>
                                </xsl:when>
                            </xsl:choose>-->
                            <!--e.g. INDICATIONS & USAGE SECTION-->
                            <xsl:choose>
                                <xsl:when test="xs:section/xs:excerpt/xs:highlight">
                                    <xsl:copy>
                                        <xsl:apply-templates select="xs:section/xs:excerpt/xs:highlight"/>
                                    </xsl:copy>
                                </xsl:when>
                            </xsl:choose>
                            <!--e.g. INSTRUCTIONS FOR USE SECTION-->
                            <xsl:choose>
                                <xsl:when test="xs:section/xs:text">
                                    <xsl:copy>
                                        <xsl:apply-templates select="xs:section/xs:text"/>
                                    </xsl:copy>
                                </xsl:when>
                            </xsl:choose>
                            <!--e.g. CLINICAL PHARMACOLOGY SECTION-->
                            <xsl:choose>
                                <xsl:when test="xs:section/xs:component/xs:section">
                                    <xsl:copy>
                                        <xsl:apply-templates select="xs:section/xs:component/xs:section"/>
                                    </xsl:copy>
                                </xsl:when>
                            </xsl:choose>
                        </psk-accordion-item>
                    </xsl:for-each>
                </psk-accordion>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>